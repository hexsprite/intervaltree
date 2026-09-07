#!/usr/bin/env node
/**
 * Head-to-head experiment: object-based IntervalTree (the shipped library)
 * vs a flat typed-array (SoA) prototype with identical semantics.
 *
 * Run:  node bench/spike/typed-array-proto.mjs
 *
 * Scope of the prototype (perf-relevant surface only):
 *   build from array, sequential add (with same-start grouping + dedupe),
 *   searchPoint, searchOverlap, contains, toArray, clone, size.
 * Not ported: remove/chop/chopAll/mergeOverlaps/ByLength queries (they are
 * dominated by result materialization/rebuild, not traversal).
 */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const here = (p) => path.join(__dirname, p)

// ---------------------------------------------------------------------------
// Build a production baseline bundle once (tsup's replaceNodeEnv is not
// reliable here — force it with esbuild's --define)
// ---------------------------------------------------------------------------
const baselinePath = here('baseline-prod.mjs')
const baselineOk = () => {
  try { return fs.readFileSync(baselinePath, 'utf8').includes('DEBUG = false') } catch { return false }
}
if (!baselineOk()) {
  const r = spawnSync('npx', [
    'esbuild', here('../../src/index.ts'), '--bundle', '--format=esm',
    `--define:process.env.NODE_ENV="production"`, `--outfile=${baselinePath}`, '--log-level=error',
  ], { cwd: here('..'), stdio: 'inherit' })
  if (r.status !== 0 || !baselineOk()) {
    console.error('failed to build production baseline bundle; aborting')
    process.exit(1)
  }
}
const { Interval, IntervalTree } = await import(baselinePath)

// ---------------------------------------------------------------------------
// Flat typed-array interval tree (SoA, 1-based node/value ids, 0 = null)
// Mirrors the invariants of src/Node.ts:
//   - BST ordered by start; all values of a node share the node start
//   - augmented: minStart / maxEnd / maxLength / height per subtree
//   - AVL rebalancing (identical rotation code)
// ---------------------------------------------------------------------------
class FlatIntervalTree {
  constructor() {
    this._start = new Float64Array(16) // node start
    this._minStart = new Float64Array(16)
    this._maxEnd = new Float64Array(16)
    this._len = new Float64Array(16)
    this._height = new Int32Array(16)
    this._left = new Int32Array(16)
    this._right = new Int32Array(16)
    this._head = new Int32Array(16) // head of node's value linked list

    this._valEnd = new Float64Array(16)
    this._valNext = new Int32Array(16)
    this._valData = new Int32Array(16)

    this._views = [null] // one stable {start,end,data} object per value
    this._data = [null] // deduped payload table (reference identity)
    this._dataMap = new Map()

    this._root = 0
    this._nNodes = 0
    this._nVals = 0
    this._size = 0 // total intervals (post-dedupe)

    this._stk = new Int32Array(64) // shared explicit stack (insert path / search)
  }

  get size() { return this._size }
  get isEmpty() { return this._root === 0 }

  // -- allocation -----------------------------------------------------------
  _allocNode() {
    const i = ++this._nNodes
    if (i >= this._start.length) this._growNodes()
    this._head[i] = 0
    this._height[i] = 1
    return i
  }
  _growNodes() {
    const cap = this._start.length << 1
    for (const k of ['_start', '_minStart', '_maxEnd', '_len']) {
      const a = new Float64Array(cap)
      a.set(this[k])
      this[k] = a
    }
    for (const k of ['_height', '_left', '_right', '_head']) {
      const a = new Int32Array(cap)
      a.set(this[k])
      this[k] = a
    }
  }
  _allocVal(s, e, dataId) {
    const i = ++this._nVals
    if (i >= this._valEnd.length) {
      const cap = this._valEnd.length << 1
      const a = new Float64Array(cap); a.set(this._valEnd); this._valEnd = a
      const b = new Int32Array(cap); b.set(this._valNext); this._valNext = b
      const c = new Int32Array(cap); c.set(this._valData); this._valData = c
    }
    this._valEnd[i] = e
    this._valData[i] = dataId
    this._valNext[i] = 0
    this._views.push({ start: s, end: e, data: this._data[dataId] })
    return i
  }
  _view(v) { return this._views[v] }

  _dataId(d) {
    const m = this._dataMap
    const id = m.get(d)
    if (id !== undefined && m.has(d) && id !== 0) return id
    // id 0 is unused
    const nid = this._data.length
    this._data.push(d)
    m.set(d, nid)
    return nid
  }

  // -- augmented attributes (mirrors Node.updateAttributes) -----------------
  _updateAttrs(n) {
    // seed maxEnd from the first value (matches baseline; every node has 1+ value)
    let first = this._head[n]
    let maxE = this._valEnd[first]
    for (let v = this._valNext[first]; v !== 0; v = this._valNext[v]) {
      const e = this._valEnd[v]
      if (e > maxE) maxE = e
    }
    let minS = this._start[n]
    let len = maxE - this._start[n]
    const l = this._left[n]
    if (l !== 0) {
      if (this._minStart[l] < minS) minS = this._minStart[l]
      if (this._maxEnd[l] > maxE) maxE = this._maxEnd[l]
      if (this._len[l] > len) len = this._len[l]
    }
    const r = this._right[n]
    if (r !== 0) {
      if (this._minStart[r] < minS) minS = this._minStart[r]
      if (this._maxEnd[r] > maxE) maxE = this._maxEnd[r]
      if (this._len[r] > len) len = this._len[r]
    }
    const changed = this._minStart[n] !== minS || this._maxEnd[n] !== maxE || this._len[n] !== len
    this._minStart[n] = minS
    this._maxEnd[n] = maxE
    this._len[n] = len
    return changed
  }
  _updateHeight(n) {
    const lh = this._height[this._left[n]]
    const rh = this._height[this._right[n]]
    this._height[n] = 1 + (lh > rh ? lh : rh)
  }

  // -- rotations (literal transcription of Node.rotate / single / double) ---
  _pushStk(cur) {
    let top = this._stkTop
    const stk = this._stk
    if (top >= stk.length) {
      const s = new Int32Array(stk.length << 1)
      s.set(stk)
      this._stk = s
      s[top] = cur
      this._stkTop = top + 1
      return
    }
    stk[top] = cur
    this._stkTop = top + 1
  }

  _rotate(n) {
    this._updateHeight(n)
    const bal = this._height[this._right[n]] - this._height[this._left[n]]
    if (Math.abs(bal) < 2) return n
    const pivotDirection = bal > 0
    const h = pivotDirection ? this._right[n] : this._left[n]
    const heavyDir = this._height[this._right[h]] - this._height[this._left[h]] > 0
    const heavy = h
    let rotatedRoot
    if (pivotDirection === heavyDir
      || this._height[this._right[h]] - this._height[this._left[h]] === 0) {
      rotatedRoot = this._singleRotate(n)
    }
    else {
      rotatedRoot = this._doubleRotate(n, heavy, pivotDirection)
    }
    this._updateHeight(rotatedRoot)
    return rotatedRoot
  }
  _singleRotate(n) {
    const pd = this._height[this._right[n]] - this._height[this._left[n]] > 0
    const h = pd ? this._right[n] : this._left[n]
    if (pd) {
      this._right[n] = this._left[h]
      this._left[h] = n
    }
    else {
      this._left[n] = this._right[h]
      this._right[h] = n
    }
    this._updateHeight(n)
    this._updateHeight(h)
    this._updateAttrs(n)
    this._updateAttrs(h)
    return h
  }
  _doubleRotate(n, heavy, hd) {
    const od = !hd
    const p = od ? this._right[heavy] : this._left[heavy]
    if (hd) this._left[heavy] = this._right[p]
    else this._right[heavy] = this._left[p]
    if (hd) this._right[p] = heavy
    else this._left[p] = heavy
    this._updateHeight(heavy)
    this._updateHeight(p)
    this._updateAttrs(heavy)
    this._updateAttrs(p)
    if (hd) this._right[n] = p
    else this._left[n] = p
    this._updateAttrs(n)
    return this._singleRotate(n)
  }

  // -- construction ---------------------------------------------------------
  static fromArray(allIntervals) {
    const t = new FlatIntervalTree()
    const m = allIntervals.length
    if (m > 0) {
      // capacity for one node per interval (worst case), one value per interval
      if (m > 16) {
        const cap = m + 1
        for (const k of ['_start', '_minStart', '_maxEnd', '_len']) {
          t[k] = new Float64Array(cap)
        }
        for (const k of ['_height', '_left', '_right', '_head']) {
          t[k] = new Int32Array(cap)
        }
        for (const k of ['_valEnd']) t[k] = new Float64Array(cap)
        for (const k of ['_valNext', '_valData']) t[k] = new Int32Array(cap)
      }
      // sort by (start, end) — same key as compareIntervals
      let order = new Array(m)
      for (let i = 0; i < m; i++) order[i] = i
      order = order.toSorted((a, b) => {
        const ia = allIntervals[a], ib = allIntervals[b]
        if (ia.start !== ib.start) return ia.start - ib.start
        return ia.end - ib.end
      })

      // group by start, dedupe (start, end, data) exactly like _groupByStart
      const groups = []
      for (const idx of order) {
        const iv = allIntervals[idx]
        let g = groups.length - 1
        if (g >= 0 && groups[g].start === iv.start && groups[g].ends.length > 0) {
          // dedupe by (end, dataId)
          const dataId = t._dataId(iv.data)
          let dup = false
          for (let i = 0; i < groups[g].ends.length; i++) {
            if (groups[g].ends[i] === iv.end && groups[g].datas[i] === dataId) { dup = true; break }
          }
          if (dup) continue
          groups[g].ends.push(iv.end)
          groups[g].datas.push(dataId)
          continue
        }
        const dataId = t._dataId(iv.data)
        groups.push({ start: iv.start, ends: [iv.end], datas: [dataId] })
      }

      // balanced O(g) build
      const build = (lo, hi) => {
        const mid = (lo + hi) >> 1
        const g = groups[mid]
        const n = t._allocNode()
        t._start[n] = g.start
        let prev = 0
        for (let i = g.ends.length - 1; i >= 0; i--) {
          const v = t._allocVal(g.start, g.ends[i], g.datas[i])
          if (prev !== 0) t._valNext[v] = prev
          prev = v
        }
        t._head[n] = prev
        if (lo === hi) {
          t._updateAttrs(n)
          return n
        }
        if (lo + 1 === hi) {
          const right = build(mid + 1, hi)
          t._right[n] = right
          t._height[n] = 2
          t._updateAttrs(n)
          return n
        }
        const left = build(lo, mid - 1)
        const right = build(mid + 1, hi)
        t._left[n] = left
        t._right[n] = right
        t._updateHeight(n)
        t._updateAttrs(n)
        return n
      }
      t._root = build(0, groups.length - 1)
      t._size = t._nVals
    }
    return t
  }

  // -- mutation -------------------------------------------------------------
  addInterval(start, end, data) {
    const dataId = this._dataId(data)
    const startArr = this._start
    let cur = this._root
    if (cur === 0) {
      const n = this._allocNode()
      this._start[n] = start
      this._head[n] = this._allocVal(start, end, dataId)
      this._updateAttrs(n)
      this._root = n
      this._size = 1
      return
    }
    let top = 0
    const stk = this._stk
    for (;;) {
      if (startArr[cur] === start) {
        // same-start node: dedupe by (end, data), else prepend value
        let dup = false
        for (let v = this._head[cur]; v !== 0; v = this._valNext[v]) {
          if (this._valEnd[v] === end && this._valData[v] === dataId) { dup = true; break }
        }
        if (dup) return
        const v = this._allocVal(start, end, dataId)
        this._valNext[v] = this._head[cur]
        this._head[cur] = v
        this._size++
        // attribute propagation only (no structural change)
        let changed = this._updateAttrs(cur)
        for (let i = top - 1; i >= 0 && changed; i--) changed = this._updateAttrs(stk[i])
        return
      }
      const dir = startArr[cur] < start ? 1 : 0
      const child = dir === 1 ? this._right[cur] : this._left[cur]
      if (child === 0) {
        const n = this._allocNode()
        this._start[n] = start
        this._head[n] = this._allocVal(start, end, dataId)
        this._updateAttrs(n)
        if (dir === 1) this._right[cur] = n
        else this._left[cur] = n
        let c = cur
        let changed = true
        for (;;) {
          changed = this._updateAttrs(c)
          this._updateHeight(c)
          const bal = this._height[this._right[c]] - this._height[this._left[c]]
          if (bal === 0) {
            for (let i = top - 1; i >= 0 && changed; i--) changed = this._updateAttrs(stk[i])
            break
          }
          else if (bal > 1 || bal < -1) {
            const rotated = this._rotate(c)
            if (top > 0) {
              const gp = stk[top - 1]
              // direction gp -> c (starts are unique across nodes)
              if (this._start[c] > this._start[gp]) this._right[gp] = rotated
              else this._left[gp] = rotated
            }
            else this._root = rotated
            break
          }
          if (top === 0) break
          top--
          c = stk[top]
        }
        this._size++
        return
      }
      if (top >= stk.length) {
        const s = new Int32Array(stk.length << 1)
        s.set(stk.subarray(0, top))
        this._stk = s
        s[top] = cur
        top++
      }
      else {
        stk[top] = cur
        top++
      }
      cur = child
    }
  }

  add(arr) {
    for (let i = 0; i < arr.length; i++) this.addInterval(arr[i].start, arr[i].end, arr[i].data)
  }

  // -- queries --------------------------------------------------------------
  searchPoint(point, result = []) {
    const root = this._root
    if (root !== 0 && !(point < this._minStart[root] || point > this._maxEnd[root])) {
      let top = 0
      const stk = this._stk
      stk[top++] = root
      while (top > 0) {
        const n = stk[--top]
        const s = this._start[n]
        for (let v = this._head[n]; v !== 0; v = this._valNext[v]) {
          if (s <= point && point < this._valEnd[v]) result.push(this._views[v])
        }
        const r = this._right[n]
        if (r !== 0 && point <= this._maxEnd[r]) stk[top++] = r
        const l = this._left[n]
        if (l !== 0 && point >= this._minStart[l]) stk[top++] = l
      }
    }
    return result
  }
  contains(point) { return this.searchPoint(point).length > 0 }

  searchOverlap(start, end, result = []) {
    const root = this._root
    if (root === 0) return result
    const stk = this._stk
    let cur = root
    let top = 0
    let l = this._left[cur]
    while (l !== 0 && start <= this._maxEnd[l]) {
      stk[top++] = cur
      cur = l
      l = this._left[cur]
    }
    for (;;) {
      if (cur === 0) {
        if (top === 0) break
        cur = stk[--top]
      }
      const s = this._start[cur]
      for (let v = this._head[cur]; v !== 0; v = this._valNext[v]) {
        if (this._valEnd[v] > start && s < end) result.push(this._views[v])
      }
      const r = this._right[cur]
      if (r !== 0 && end >= this._minStart[r]) {
        cur = r
        l = this._left[cur]
        while (l !== 0 && start <= this._maxEnd[l]) {
          stk[top++] = cur
          cur = l
          l = this._left[cur]
        }
      }
      else cur = 0
    }
    return result
  }

  toArray(result = []) {
    const root = this._root
    if (root === 0) return result
    const stk = this._stk
    let cur = root
    let top = 0
    let l = this._left[cur]
    while (l !== 0) { stk[top++] = cur; cur = l; l = this._left[cur] }
    for (;;) {
      if (cur === 0) {
        if (top === 0) break
        cur = stk[--top]
      }
      for (let v = this._head[cur]; v !== 0; v = this._valNext[v]) result.push(this._views[v])
      const r = this._right[cur]
      if (r !== 0) {
        cur = r
        l = this._left[cur]
        while (l !== 0) { stk[top++] = cur; cur = l; l = this._left[cur] }
      }
      else cur = 0
    }
    return result
  }

  clone() {
    const c = new FlatIntervalTree()
    const nn = this._nNodes + 1
    const nv = this._nVals + 1
    c._start = new Float64Array(this._start.slice(0, nn))
    c._minStart = new Float64Array(this._minStart.slice(0, nn))
    c._maxEnd = new Float64Array(this._maxEnd.slice(0, nn))
    c._len = new Float64Array(this._len.slice(0, nn))
    c._height = new Int32Array(this._height.slice(0, nn))
    c._left = new Int32Array(this._left.slice(0, nn))
    c._right = new Int32Array(this._right.slice(0, nn))
    c._head = new Int32Array(this._head.slice(0, nn))
    c._valEnd = new Float64Array(this._valEnd.slice(0, nv))
    c._valNext = new Int32Array(this._valNext.slice(0, nv))
    c._valData = new Int32Array(this._valData.slice(0, nv))
    c._root = this._root
    c._nNodes = this._nNodes
    c._nVals = this._nVals
    c._size = this._size
    c._views = this._views // shallow: share interval objects, like the baseline
    c._data = this._data
    c._dataMap = this._dataMap
    return c
  }
}

// ---------------------------------------------------------------------------
// Facades — identical call shapes so the harness treats both the same
// ---------------------------------------------------------------------------
const jsImpl = {
  name: 'object baseline ',
  fresh() { return new IntervalTree() },
  fromArray(ivs) { return new IntervalTree(ivs.map(x => new Interval(x.start, x.end, x.data))) },
  add(t, x) { t.addInterval(x.start, x.end, x.data) },
  size(t) { return t.size },
  searchPoint(t, p) { return t.searchPoint(p) },
  searchOverlap(t, a, b) { return t.searchOverlap(a, b) },
  contains(t, p) { return t.contains(p) },
  toArray(t) { return t.toArray() },
  cloneTree(t) { return t.clone() },
  interval: Interval,
}
const taImpl = {
  name: 'typed-array proto',
  fresh() { return new FlatIntervalTree() },
  fromArray(ivs) { return FlatIntervalTree.fromArray(ivs) },
  add(t, x) { t.addInterval(x.start, x.end, x.data) },
  size(t) { return t.size },
  searchPoint(t, p) { return t.searchPoint(p) },
  searchOverlap(t, a, b) { return t.searchOverlap(a, b) },
  contains(t, p) { return t.contains(p) },
  toArray(t) { return t.toArray() },
  cloneTree(t) { return t.clone() },
  interval: FlatIntervalTree,
}

const QUICK = process.argv.includes('--quick')

// ---------------------------------------------------------------------------
// Deterministic pseudo-random (so the two trees take identical op sequences)
// ---------------------------------------------------------------------------
function mulberry32(seed) {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed)
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function genIntervals(n) {
  const ivs = new Array(n)
  for (let i = 0; i < n; i++) ivs[i] = { start: i * 10, end: i * 10 + 8, data: undefined }
  return ivs
}

// ---------------------------------------------------------------------------
// Correctness: both implementations must produce identical observables
// ---------------------------------------------------------------------------
function checkCorrectness() {
  const rnd = mulberry32(42)
  const A = { tag: 'A' }
  const ivs = []
  const n = 2000
  for (let i = 0; i < n; i++) ivs.push({ start: i * 10, end: i * 10 + 8, data: i % 7 === 0 ? A : undefined })
  // duplicates (must dedupe)
  for (let i = 0; i < 200; i++) {
    const src = ivs[(rnd() * n) | 0]
    ivs.push({ start: src.start, end: src.end, data: src.data })
  }
  // same-start, different end (grouped nodes)
  for (let i = 0; i < 300; i++) {
    const s = ((rnd() * n) | 0) * 10
    ivs.push({ start: s, end: s + 4 + ((rnd() * 5) | 0), data: i % 3 === 0 ? A : undefined })
  }
  const extra = []
  for (let i = 0; i < 100; i++) {
    const s = ((rnd() * (n * 12)) | 0)
    extra.push({ start: s, end: s + 1 + ((rnd() * 6) | 0), data: i % 5 === 0 ? A : undefined })
  }

  const ja = jsImpl.fromArray(ivs)
  const ta = taImpl.fromArray(ivs)
  for (const x of extra) { jsImpl.add(ja, x); taImpl.add(ta, x) }

  const dataKey = new Map()
  let dk = 0
  const keyOf = (iv) => {
    const d = iv.data
    let k = dataKey.get(d)
    if (k === undefined) { k = ++dk; dataKey.set(d, k) }
    return `${iv.start}|${iv.end}|${k ?? 'u'}`
  }
  const sortedKeys = (arr) => arr.map(keyOf).toSorted()
  const sameSet = (a, b) => {
    const ka = sortedKeys(a), kb = sortedKeys(b)
    if (ka.length !== kb.length) return false
    for (let i = 0; i < ka.length; i++) if (ka[i] !== kb[i]) return false
    return true
  }

  const msgs = []
  const check = (label, cond) => { if (!cond) msgs.push(`MISMATCH: ${label}`) }

  check('size after fromArray+add', jsImpl.size(ja) === taImpl.size(ta))
  check('toArray multiset', sameSet(jsImpl.toArray(ja), taImpl.toArray(ta)))

  const total = n * 10 + 20
  for (let i = 0; i < 300; i++) {
    const p = total * rnd() | 0
    const a = jsImpl.searchPoint(ja, p)
    const b = taImpl.searchPoint(ta, p)
    check(`searchPoint(${p})`, sameSet(a, b))
    check(`contains(${p})`, jsImpl.contains(ja, p) === taImpl.contains(ta, p))
  }
  for (let i = 0; i < 300; i++) {
    const a0 = total * rnd() | 0
    const wid = 1 + (rnd() * 60 | 0)
    const a = jsImpl.searchOverlap(ja, a0, a0 + wid)
    const b = taImpl.searchOverlap(ta, a0, a0 + wid)
    check(`searchOverlap(${a0}, ${a0 + wid})`, sameSet(a, b))
  }
  const jcl = jsImpl.cloneTree(ja)
  const tcl = taImpl.cloneTree(ta)
  check('clone toArray multiset', sameSet(jsImpl.toArray(jcl), taImpl.toArray(tcl)))
  check('clone size', jsImpl.size(jcl) === taImpl.size(tcl))

  if (msgs.length === 0) console.log('correctness           : PASS (size, toArray, searchPoint, searchOverlap, contains, clone — vs 2000+ group/dedupe workload)')
  else { console.error(msgs.join('\n')); process.exit(1) }
}

// ---------------------------------------------------------------------------
// Benchmark
// ---------------------------------------------------------------------------
const t0 = () => process.hrtime.bigint()
const ns = (a) => Number(process.hrtime.bigint() - a)

function benchSuite(impl, N, Q) {
  const ivs = genIntervals(N)
  const total = N * 10
  const spPoints = new Array(Q)
  const soPoints = new Array(Q)
  for (let q = 0; q < Q; q++) {
    const p = (q * 7919) % total
    spPoints[q] = p
    soPoints[q] = p
  }

  // ---- warmup (JIT) — same op mix for every implementation ----
  {
    const WQ = QUICK ? 5_000 : 20_000
    const WA = QUICK ? 10_000 : 50_000
    const t = impl.fromArray(ivs)
    for (let q = 0; q < WQ; q++) {
      impl.searchPoint(t, spPoints[q])
      impl.searchOverlap(t, soPoints[q], soPoints[q] + 80)
      impl.contains(t, spPoints[q])
    }
    let a = impl.fresh()
    for (let i = 0; i < Math.min(WA, N); i++) impl.add(a, ivs[i])
    impl.toArray(t)
    impl.cloneTree(t)
  }

  // ---- timed (min of 3) ----
  const ops = []
  ops.push(['build (from unsorted array)', () => impl.fromArray(ivs), N])
  ops.push(['N sequential adds (fresh tree)', () => {
    const t = impl.fresh()
    for (let i = 0; i < N; i++) impl.add(t, ivs[i])
  }, N])
  ops.push(['searchPoint (Q queries)', () => {
    const t = impl.fromArray(ivs)
    for (let q = 0; q < Q; q++) impl.searchPoint(t, spPoints[q])
  }, Q])
  ops.push(['searchOverlap narrow (Q queries)', () => {
    const t = impl.fromArray(ivs)
    for (let q = 0; q < Q; q++) impl.searchOverlap(t, soPoints[q], soPoints[q] + 80)
  }, Q])
  ops.push(['contains (Q queries)', () => {
    const t = impl.fromArray(ivs)
    for (let q = 0; q < Q; q++) impl.contains(t, spPoints[q])
  }, Q])
  ops.push(['toArray (full scan)', () => {
    const t = impl.fromArray(ivs)
    impl.toArray(t)
  }, N])
  ops.push(['clone (deep, full copy)', () => {
    const t = impl.fromArray(ivs)
    impl.cloneTree(t)
  }, N])

  const perOp = {}
  for (const [label, fn, count] of ops) {
    // min of 3 full passes; build fresh tree inside each pass
    const passes = []
    for (let r = 0; r < 3; r++) {
      const a = t0()
      fn()
      passes.push(ns(a))
    }
    passes.sort((x, y) => x - y)
    perOp[label] = { totalNs: passes[0], perItemNs: passes[0] / count }
  }
  return perOp
}

function report() {
  checkCorrectness()

  const all = new Map()
  const sections = QUICK
    ? [{ N: 10_000, Q: 50_000 }]
    : [
        { N: 10_000, Q: 200_000 },
        { N: 1_000_000, Q: 200_000 },
      ]
  for (const { N, Q } of sections) {
    console.log(`\n=== N = ${N.toLocaleString()} (Q = ${Q.toLocaleString()} queries per pass) ===`)
    all.set(N, {})
    for (const impl of [jsImpl, taImpl]) {
      console.error(`  benching ${impl.name} N=${N} ...`)
      const key = impl === jsImpl ? 'js' : 'ta'
      all.get(N)[key] = benchSuite(impl, N, Q)
    }

    const labels = Object.keys(all.get(N).js)
    console.log(''.padEnd(34), 'object (ns/op)', 'typed (ns/op)', 'speedup')
    for (const label of labels) {
      const j = all.get(N).js[label]
      const t = all.get(N).ta[label]
      const fmt = (x) => x >= 1000 ? (x / 1000).toFixed(1) + 'µs' : x.toFixed(x >= 10 ? 0 : 1) + 'ns'
      console.log(label.padEnd(34), String(fmt(j.perItemNs)).padStart(12), String(fmt(t.perItemNs)).padStart(12), (j.perItemNs / t.perItemNs).toFixed(2) + 'x')
    }
  }
}

export { FlatIntervalTree, benchSuite, genIntervals, mulberry32 }

if (process.argv[1] === fileURLToPath(import.meta.url))
  report()