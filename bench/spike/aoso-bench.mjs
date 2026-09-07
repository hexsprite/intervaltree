#!/usr/bin/env node
/**
 * AoSoA (array-of-structs-of-array) typed-array interval tree prototype.
 *
 * Same semantics as bench/spike/typed-array-proto.mjs (SoA variant), but the node
 * struct lives in ONE stride-8 Float64Array so a tree level touches a single
 * contiguous 64-byte cache line (the SoA variant scattered hot fields over
 * nine separate arrays = up to nine random cache lines per node visit).
 *
 * Layout per node i (1-based; i<<3):
 *   [0] start   [1] minStart  [2] maxEnd  [3] len
 *   [4] height  [5] left      [6] right   [7] head (first value id)
 *
 * Values keep small SoA arrays (end/next/dataId) + one stable view object
 * per value, exactly like the SoA variant and the baseline.
 *
 * Run:  node bench/spike/aoso-bench.mjs [--quick]
 */
import { fileURLToPath } from 'node:url'
import {
  FlatIntervalTree, benchSuite, genIntervals, mulberry32,
} from './typed-array-proto.mjs'
import { Interval, IntervalTree } from './baseline-prod.mjs'

// ---------------------------------------------------------------------------
// AoSoA flat typed-array interval tree
// ---------------------------------------------------------------------------
class AosoIntervalTree {
  constructor() {
    this._g = new Float64Array(8 * 16)

    this._valEnd = new Float64Array(16)
    this._valNext = new Int32Array(16)
    this._valData = new Int32Array(16)

    this._views = [null]
    this._data = [null]
    this._dataMap = new Map()

    this._root = 0
    this._nNodes = 0
    this._nVals = 0
    this._size = 0

    this._stk = new Int32Array(64)
  }

  get size() { return this._size }
  get isEmpty() { return this._root === 0 }

  // -- allocation -----------------------------------------------------------
  _allocNode() {
    const i = ++this._nNodes
    const nn = i << 3
    if (nn + 8 > this._g.length) {
      const a = new Float64Array(this._g.length << 1)
      a.set(this._g)
      this._g = a
    }
    this._g[nn + 7] = 0
    this._g[nn + 4] = 1
    return i
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
  _dataId(d) {
    const m = this._dataMap
    const id = m.get(d)
    if (id !== undefined && m.has(d) && id !== 0) return id
    const nid = this._data.length
    this._data.push(d)
    m.set(d, nid)
    return nid
  }

  // -- augmented attributes (mirrors Node.updateAttributes) -----------------
  _updateAttrs(n) {
    const g = this._g
    const nn = n << 3
    const vE = this._valEnd
    const vN = this._valNext
    const first = g[nn + 7]
    let maxE = vE[first]
    for (let v = vN[first]; v !== 0; v = vN[v]) {
      const e = vE[v]
      if (e > maxE) maxE = e
    }
    const s0 = g[nn]
    let minS = s0
    let len = maxE - s0
    const l = g[nn + 5]
    if (l !== 0) {
      const ln = l << 3
      if (g[ln + 1] < minS) minS = g[ln + 1]
      if (g[ln + 2] > maxE) maxE = g[ln + 2]
      if (g[ln + 3] > len) len = g[ln + 3]
    }
    const r = g[nn + 6]
    if (r !== 0) {
      const rn = r << 3
      if (g[rn + 1] < minS) minS = g[rn + 1]
      if (g[rn + 2] > maxE) maxE = g[rn + 2]
      if (g[rn + 3] > len) len = g[rn + 3]
    }
    const changed = g[nn + 1] !== minS || g[nn + 2] !== maxE || g[nn + 3] !== len
    g[nn + 1] = minS
    g[nn + 2] = maxE
    g[nn + 3] = len
    return changed
  }
  _updateHeight(n) {
    const g = this._g
    const nn = n << 3
    const lh = g[(g[nn + 5] << 3) + 4]
    const rh = g[(g[nn + 6] << 3) + 4]
    g[nn + 4] = 1 + (lh > rh ? lh : rh)
  }

  // -- rotations (same logic as the checked SoA variant) --------------------
  _rotate(n) {
    this._updateHeight(n)
    const g = this._g
    const nn = n << 3
    const l = g[nn + 5]
    const r = g[nn + 6]
    const bal = g[(r << 3) + 4] - g[(l << 3) + 4]
    if (Math.abs(bal) < 2) return n
    const pivotDirection = bal > 0
    const h = pivotDirection ? r : l
    const hn = h << 3
    const hl = g[hn + 5]
    const hr = g[hn + 6]
    const hb = g[(hr << 3) + 4] - g[(hl << 3) + 4]
    const heavyDir = hb > 0
    let rotatedRoot
    if (pivotDirection === heavyDir || hb === 0) {
      rotatedRoot = this._singleRotate(n)
    }
    else {
      rotatedRoot = this._doubleRotate(n, h, pivotDirection)
    }
    this._updateHeight(rotatedRoot)
    return rotatedRoot
  }
  _singleRotate(n) {
    const g = this._g
    const nn = n << 3
    const pd = g[(g[nn + 6] << 3) + 4] > g[(g[nn + 5] << 3) + 4]
    const h = pd ? g[nn + 6] : g[nn + 5]
    const hn = h << 3
    if (pd) {
      g[nn + 6] = g[hn + 5]
      g[hn + 5] = n
    }
    else {
      g[nn + 5] = g[hn + 6]
      g[hn + 6] = n
    }
    this._updateHeight(n)
    this._updateHeight(h)
    this._updateAttrs(n)
    this._updateAttrs(h)
    return h
  }
  _doubleRotate(n, heavy, hd) {
    const g = this._g
    const nn = n << 3
    const hn = heavy << 3
    const p = hd ? g[hn + 5] : g[hn + 6]
    const pn = p << 3
    if (hd) g[hn + 5] = g[pn + 6]
    else g[hn + 6] = g[pn + 5]
    if (hd) g[pn + 6] = heavy
    else g[pn + 5] = heavy
    this._updateHeight(heavy)
    this._updateHeight(p)
    this._updateAttrs(heavy)
    this._updateAttrs(p)
    if (hd) g[nn + 6] = p
    else g[nn + 5] = p
    this._updateAttrs(n)
    return this._singleRotate(n)
  }

  // -- construction ---------------------------------------------------------
  static fromArray(allIntervals) {
    const t = new AosoIntervalTree()
    const m = allIntervals.length
    if (m > 0) {
      if (m > 16) {
        const cap = m + 1
        t._g = new Float64Array(cap * 8)
        t._valEnd = new Float64Array(cap)
        t._valNext = new Int32Array(cap)
        t._valData = new Int32Array(cap)
      }
      let order = new Array(m)
      for (let i = 0; i < m; i++) order[i] = i
      order = order.toSorted((a, b) => {
        const ia = allIntervals[a], ib = allIntervals[b]
        if (ia.start !== ib.start) return ia.start - ib.start
        return ia.end - ib.end
      })

      const groups = []
      for (const idx of order) {
        const iv = allIntervals[idx]
        const g = groups.length - 1
        if (g >= 0 && groups[g].start === iv.start) {
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

      const build = (lo, hi) => {
        const mid = (lo + hi) >> 1
        const grp = groups[mid]
        const n = t._allocNode()
        const nn = n << 3
        t._g[nn] = grp.start
        const g = t._g
        let prev = 0
        for (let i = grp.ends.length - 1; i >= 0; i--) {
          const v = t._allocVal(grp.start, grp.ends[i], grp.datas[i])
          if (prev !== 0) t._valNext[v] = prev
          prev = v
        }
        t._g[nn + 7] = prev
        if (lo === hi) {
          t._updateAttrs(n)
          return n
        }
        if (lo + 1 === hi) {
          const right = build(mid + 1, hi)
          const rn = right << 3
          g[nn + 6] = right
          g[nn + 4] = 2
          g[rn + 4] = 1
          t._updateAttrs(n)
          return n
        }
        const left = build(lo, mid - 1)
        const right = build(mid + 1, hi)
        g[nn + 5] = left
        g[nn + 6] = right
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
    let g = this._g
    let cur = this._root
    if (cur === 0) {
      const n = this._allocNode()
      const g0 = this._g // allocNode may have grown _g
      const nn = n << 3
      g0[nn] = start
      g0[nn + 7] = this._allocVal(start, end, dataId)
      this._updateAttrs(n)
      this._root = n
      this._size = 1
      return
    }
    let top = 0
    const stk = this._stk
    for (;;) {
      const cn = cur << 3
      const cs = g[cn]
      if (cs === start) {
        let dup = false
        const vE = this._valEnd
        const vN = this._valNext
        const vD = this._valData
        for (let v = g[cn + 7]; v !== 0; v = vN[v]) {
          if (vE[v] === end && vD[v] === dataId) { dup = true; break }
        }
        if (dup) return
        const v = this._allocVal(start, end, dataId)
        this._valNext[v] = g[cn + 7]
        g[cn + 7] = v
        this._size++
        let changed = this._updateAttrs(cur)
        for (let i = top - 1; i >= 0 && changed; i--) changed = this._updateAttrs(stk[i])
        return
      }
      const dir = cs < start ? 1 : 0
      const child = dir === 1 ? g[cn + 6] : g[cn + 5]
      if (child === 0) {
        const n = this._allocNode()
        const g0 = this._g // allocNode may have grown _g
        const nn = n << 3
        g0[nn] = start
        g0[nn + 7] = this._allocVal(start, end, dataId)
        this._updateAttrs(n)
        if (dir === 1) g0[cn + 6] = n
        else g0[cn + 5] = n
        g = g0
        let c = cur
        let changed = true
        for (;;) {
          changed = this._updateAttrs(c)
          this._updateHeight(c)
          const cn2 = c << 3
          const bal = g[(g[cn2 + 6] << 3) + 4] - g[(g[cn2 + 5] << 3) + 4]
          if (bal === 0) {
            for (let i = top - 1; i >= 0 && changed; i--) changed = this._updateAttrs(stk[i])
            break
          }
          else if (bal > 1 || bal < -1) {
            const rotated = this._rotate(c)
            if (top > 0) {
              const gp = stk[top - 1]
              if (g[cn2] > g[(gp << 3)]) g[(gp << 3) + 6] = rotated
              else g[(gp << 3) + 5] = rotated
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
    if (root !== 0) {
      const g = this._g
      const rn = root << 3
      if (!(point < g[rn + 1] || point > g[rn + 2])) {
        let top = 0
        const stk = this._stk
        const vN = this._valNext
        const vE = this._valEnd
        const vws = this._views
        stk[top++] = root
        while (top > 0) {
          const n = stk[--top]
          const nn = n << 3
          const s = g[nn]
          for (let v = g[nn + 7]; v !== 0; v = vN[v]) {
            if (s <= point && point < vE[v]) result.push(vws[v])
          }
          const r = g[nn + 6]
          if (r !== 0 && point <= g[(r << 3) + 2]) stk[top++] = r
          const l = g[nn + 5]
          if (l !== 0 && point >= g[(l << 3) + 1]) stk[top++] = l
        }
      }
    }
    return result
  }
  contains(point) { return this.searchPoint(point).length > 0 }

  searchOverlap(start, end, result = []) {
    const root = this._root
    if (root === 0) return result
    const g = this._g
    const stk = this._stk
    const vN = this._valNext
    const vE = this._valEnd
    const vws = this._views
    let cur = root
    let top = 0
    let l = g[(cur << 3) + 5]
    while (l !== 0 && start <= g[(l << 3) + 2]) {
      stk[top++] = cur
      cur = l
      l = g[(cur << 3) + 5]
    }
    for (;;) {
      if (cur === 0) {
        if (top === 0) break
        cur = stk[--top]
      }
      const cn = cur << 3
      const s = g[cn]
      for (let v = g[cn + 7]; v !== 0; v = vN[v]) {
        if (vE[v] > start && s < end) result.push(vws[v])
      }
      const r = g[cn + 6]
      if (r !== 0 && end >= g[(r << 3) + 1]) {
        cur = r
        l = g[(cur << 3) + 5]
        while (l !== 0 && start <= g[(l << 3) + 2]) {
          stk[top++] = cur
          cur = l
          l = g[(cur << 3) + 5]
        }
      }
      else cur = 0
    }
    return result
  }

  toArray(result = []) {
    const root = this._root
    if (root === 0) return result
    const g = this._g
    const stk = this._stk
    const vN = this._valNext
    const vws = this._views
    let cur = root
    let top = 0
    let l = g[(cur << 3) + 5]
    while (l !== 0) { stk[top++] = cur; cur = l; l = g[(cur << 3) + 5] }
    for (;;) {
      if (cur === 0) {
        if (top === 0) break
        cur = stk[--top]
      }
      const cn = cur << 3
      for (let v = g[cn + 7]; v !== 0; v = vN[v]) result.push(vws[v])
      const r = g[cn + 6]
      if (r !== 0) {
        cur = r
        l = g[(cur << 3) + 5]
        while (l !== 0) { stk[top++] = cur; cur = l; l = g[(cur << 3) + 5] }
      }
      else cur = 0
    }
    return result
  }

  clone() {
    const c = new AosoIntervalTree()
    const nn = this._nNodes + 1
    const nv = this._nVals + 1
    c._g = this._g.slice(0, nn * 8)
    c._valEnd = this._valEnd.slice(0, nv)
    c._valNext = this._valNext.slice(0, nv)
    c._valData = this._valData.slice(0, nv)
    c._root = this._root
    c._nNodes = this._nNodes
    c._nVals = this._nVals
    c._size = this._size
    c._views = this._views
    c._data = this._data
    c._dataMap = this._dataMap
    return c
  }
}

// ---------------------------------------------------------------------------
// Structural validator (in-order + balance + parent uniqueness)
// ---------------------------------------------------------------------------
function validateStructure(t, label) {
  const g = t._g
  const parents = new Int32Array(t._nNodes + 1)
  for (let i = 1; i <= t._nNodes; i++) {
    const nn = i << 3
    const l = g[nn + 5], r = g[nn + 6]
    if (l) parents[l]++
    if (r) parents[r]++
  }
  if (parents[t._root] !== 0) return `${label}: root has a parent`
  for (let i = 1; i <= t._nNodes; i++) {
    if (i === t._root) continue
    if (parents[i] !== 1) return `${label}: node ${i} has ${parents[i]} parents`
  }
  const st = []
  let cur = t._root
  let prev = -Infinity
  let count = 0
  while (cur || st.length) {
    while (cur) { st.push(cur); cur = g[(cur << 3) + 5] }
    cur = st.pop()
    if (count++ > 2 * (t._nNodes + 1)) return `${label}: in-order did not terminate (cycle)`
    if (prev >= g[(cur << 3)]) return `${label}: order violation at node ${cur}`
    prev = g[(cur << 3)]
    cur = g[(cur << 3) + 6]
  }
  if (count !== t._nNodes) return `${label}: in-order visited ${count}/${t._nNodes}`
  let balBad = 0
  const compute = (x) => {
    if (x === 0) return 0
    const nn = x << 3
    const lh = compute(g[nn + 5])
    const rh = compute(g[nn + 6])
    const b = rh - lh
    if (Math.abs(b) > 1) { balBad++; if (balBad > 3) return 0 }
    const h = 1 + (lh > rh ? lh : rh)
    if (g[nn + 4] !== h) { balBad++; if (balBad > 3) return 0 }
    return h
  }
  compute(t._root)
  if (balBad > 0) return `${label}: balance/height violations (${balBad})`
  return ''
}

// ---------------------------------------------------------------------------
// Facades
// ---------------------------------------------------------------------------
const QUICK = process.argv.includes('--quick')

const jsImpl = {
  name: 'object baseline',
  fresh() { return new IntervalTree() },
  fromArray(ivs) { return new IntervalTree(ivs.map(x => new Interval(x.start, x.end, x.data))) },
  add(t, x) { t.addInterval(x.start, x.end, x.data) },
  size(t) { return t.size },
  searchPoint(t, p) { return t.searchPoint(p) },
  searchOverlap(t, a, b) { return t.searchOverlap(a, b) },
  contains(t, p) { return t.contains(p) },
  toArray(t) { return t.toArray() },
  cloneTree(t) { return t.clone() },
}
const soaImpl = { name: 'SoA flat', fresh: () => new FlatIntervalTree(), fromArray: (ivs) => FlatIntervalTree.fromArray(ivs) }
const aosoImpl = { name: 'AoSoA flat', fresh: () => new AosoIntervalTree(), fromArray: (ivs) => AosoIntervalTree.fromArray(ivs) }
for (const impl of [soaImpl, aosoImpl]) {
  impl.add = (t, x) => t.addInterval(x.start, x.end, x.data)
  impl.size = (t) => t.size
  impl.searchPoint = (t, p) => t.searchPoint(p)
  impl.searchOverlap = (t, a, b) => t.searchOverlap(a, b)
  impl.contains = (t, p) => t.contains(p)
  impl.toArray = (t) => t.toArray()
  impl.cloneTree = (t) => t.clone()
}

// ---------------------------------------------------------------------------
// Correctness: aoso vs baseline (same workload as the SoA prototype)
// ---------------------------------------------------------------------------
function checkCorrectness() {
  const rnd = mulberry32(42)
  const A = { tag: 'A' }
  const ivs = []
  const n = 2000
  for (let i = 0; i < n; i++) ivs.push({ start: i * 10, end: i * 10 + 8, data: i % 7 === 0 ? A : undefined })
  for (let i = 0; i < 200; i++) {
    const src = ivs[(rnd() * n) | 0]
    ivs.push({ start: src.start, end: src.end, data: src.data })
  }
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
  const ta = aosoImpl.fromArray(ivs)
  const soa = soaImpl.fromArray(ivs)
  for (const x of extra) {
    jsImpl.add(ja, x)
    aosoImpl.add(ta, x)
    soaImpl.add(soa, x)
  }

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

  const struct = validateStructure(ta, 'aoso')
  if (struct) msgs.push(`STRUCTURE: ${struct}`)

  check('size after fromArray+add', jsImpl.size(ja) === aosoImpl.size(ta))
  check('toArray multiset', sameSet(jsImpl.toArray(ja), aosoImpl.toArray(ta)))
  check('aoso vs soa toArray multiset', sameSet(soaImpl.toArray(soa), aosoImpl.toArray(ta)))

  const total = n * 10 + 20
  for (let i = 0; i < 300; i++) {
    const p = total * rnd() | 0
    const a = jsImpl.searchPoint(ja, p)
    const b = aosoImpl.searchPoint(ta, p)
    check(`searchPoint(${p})`, sameSet(a, b))
    check(`contains(${p})`, jsImpl.contains(ja, p) === aosoImpl.contains(ta, p))
  }
  for (let i = 0; i < 300; i++) {
    const a0 = total * rnd() | 0
    const wid = 1 + (rnd() * 60 | 0)
    const a = jsImpl.searchOverlap(ja, a0, a0 + wid)
    const b = aosoImpl.searchOverlap(ta, a0, a0 + wid)
    check(`searchOverlap(${a0}, ${a0 + wid})`, sameSet(a, b))
  }
  const jcl = jsImpl.cloneTree(ja)
  const tcl = aosoImpl.cloneTree(ta)
  check('clone toArray multiset', sameSet(jsImpl.toArray(jcl), aosoImpl.toArray(tcl)))
  check('clone size', jsImpl.size(jcl) === aosoImpl.size(tcl))

  if (msgs.length === 0) console.log('correctness           : PASS (size, structure, toArray, searchPoint, searchOverlap, contains, clone — vs 2000+ group/dedupe workload; cross-checked vs SoA)')
  else { console.error(msgs.join('\n')); process.exit(1) }
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------
function fmt(x) {
  return x >= 1000 ? (x / 1000).toFixed(1) + 'µs' : x.toFixed(x >= 10 ? 0 : 1) + 'ns'
}

function report() {
  checkCorrectness()

  const sections = QUICK
    ? [{ N: 10_000, Q: 50_000 }]
    : [
        { N: 10_000, Q: 200_000 },
        { N: 1_000_000, Q: 200_000 },
      ]
  const impls = [jsImpl, soaImpl, aosoImpl]
  for (const { N, Q } of sections) {
    console.log(`\n=== N = ${N.toLocaleString()} (Q = ${Q.toLocaleString()} queries per pass) ===`)
    const results = []
    for (const impl of impls) {
      console.error(`  benching ${impl.name} N=${N} ...`)
      results.push(benchSuite(impl, N, Q))
    }
    const labels = Object.keys(results[0])
    console.log(''.padEnd(34), 'object (ns/op)', 'SoA (ns/op)', 'AoSoA (ns/op)', 'win vs object')
    for (const label of labels) {
      const j = results[0][label].perItemNs
      const s = results[1][label].perItemNs
      const a = results[2][label].perItemNs
      const best = Math.min(j, s, a)
      const tag = best === j ? '' : best === s ? 'SoA ' : 'AoSoA'
      console.log(
        label.padEnd(34),
        fmt(j).padStart(13),
        fmt(s).padStart(13),
        fmt(a).padStart(15),
        (j / best).toFixed(2) + 'x ' + tag,
      )
    }
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url))
  report()
export { AosoIntervalTree }