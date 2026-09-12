// Model-based property testing using fast-check
// https://fast-check.dev/docs/advanced/model-based-testing/

import fc from 'fast-check'
import prand from 'pure-rand'
import { describe, expect, it } from 'vitest'
import { ArrayIntervalCollection } from './ArrayIntervalCollection'
import { Interval } from './Interval'
import { IntervalTree } from './IntervalTree'

/**
 * Canonical string form: sorted by (start, end, data label) so tie order
 * among intervals with identical (start, end) but different data never
 * matters. That tie order is unspecified by both the tree (BST/original-start
 * order) and the array oracle (insertion order), and the two conventions can
 * disagree once a chop-like op collapses two different-start intervals onto
 * the same bounds.
 */
function canon(ivs: Interval[]): string[] {
  const label = (d: unknown) => d === undefined ? '' : typeof d === 'object' ? JSON.stringify(d) : String(d)
  return ivs
    .map(iv => [iv.start, iv.end, label(iv.data)] as const)
    .sort((a, b) => a[0] - b[0] || a[1] - b[1] || (a[2] < b[2] ? -1 : a[2] > b[2] ? 1 : 0))
    .map(t => `${t[0]},${t[1]},${t[2]}`)
}

/**
 * Bounds only, ignoring data. mergeOverlaps() keeps `data` from the
 * earliest-starting interval of a run, but among ties (identical bounds)
 * which one wins is unspecified — see MergeOverlapsCommand.
 */
function canonBounds(ivs: Interval[]): string[] {
  return ivs
    .map(iv => [iv.start, iv.end] as const)
    .sort((a, b) => a[0] - b[0] || a[1] - b[1])
    .map(t => `${t[0]},${t[1]}`)
}

class AddCommand implements fc.Command<ArrayIntervalCollection, IntervalTree> {
  interval: Interval

  constructor(value: { start: number, end: number, data?: unknown }) {
    this.interval = new Interval(value.start, value.end, value.data)
  }

  check = () => true

  run(m: ArrayIntervalCollection, r: IntervalTree): void {
    r.add(this.interval)
    m.add(this.interval)
    expect(canon(r.toArray())).toEqual(canon(m.toArray()))
  }

  toString = () => `add(${this.interval.toString()})`
}

class RemoveCommand implements fc.Command<ArrayIntervalCollection, IntervalTree> {
  readonly seed: number
  index = 0

  constructor(seed: number) {
    this.seed = seed
  }

  check(m: ArrayIntervalCollection) {
    return m.size > 0
  }

  run(m: ArrayIntervalCollection, r: IntervalTree): void {
    const rng = prand.xoroshiro128plus(this.seed)
    const [index] = prand.uniformIntDistribution(0, m.size - 1, rng)
    const removed = m.toSorted().at(index)!

    m.remove(removed)
    r.remove(removed)

    expect(canon(r.toArray())).toEqual(canon(m.toArray()))
  }

  toString = () => `remove(seed=${this.seed}, index=${this.index})`
}

class ChopCommand implements fc.Command<ArrayIntervalCollection, IntervalTree> {
  interval: Interval

  constructor(value: { start: number, end: number, data?: unknown }) {
    this.interval = new Interval(value.start, value.end, value.data)
  }

  check(m: ArrayIntervalCollection) {
    return m.size > 0
  }

  run(m: ArrayIntervalCollection, r: IntervalTree): void {
    r.chop(this.interval.start, this.interval.end)
    m.chop(this.interval.start, this.interval.end)
    r.verify()

    expect(canon(r.toArray())).toEqual(canon(m.toArray()))
  }

  toString = () => `chop(${this.interval})`
}

class SearchCommand implements fc.Command<ArrayIntervalCollection, IntervalTree> {
  value: number

  constructor(value: number) {
    this.value = value
  }

  check = () => true

  run(m: ArrayIntervalCollection, r: IntervalTree): void {
    // canon() also serializes via public getters — Interval's fields are true
    // #private, so a raw toEqual(Interval[]) never sees a mismatch (own
    // enumerable properties are empty on every instance).
    expect(canon(r.searchPoint(this.value))).toEqual(canon(m.searchPoint(this.value)))
  }

  toString = () => `search(${this.value})`
}

class FindOneByLengthStartingAtCommand implements fc.Command<ArrayIntervalCollection, IntervalTree> {
  minLength: number
  startingAt: number

  constructor(minLength: number, startingAt: number) {
    this.minLength = minLength
    this.startingAt = startingAt
  }

  check = () => true

  run(m: ArrayIntervalCollection, r: IntervalTree): void {
    const rResult = r.findOneByLengthStartingAt(this.minLength, this.startingAt)
    const mResult = m.findOneByLengthStartingAt(this.minLength, this.startingAt)
    if (rResult === undefined || mResult === undefined) {
      expect(rResult).toBeUndefined()
      expect(mResult).toBeUndefined()
      return
    }
    // Bounds are exact; among identical bounds, data choice is unspecified
    // (mirrors the first()/last()/mergeOverlaps() contract), so check data
    // by membership against the oracle's full interval set. A result may be
    // clipped to startingAt, so compare against each candidate's own clipped
    // start, not its stored start.
    expect(rResult.start).toBe(mResult.start)
    expect(rResult.end).toBe(mResult.end)
    const candidates = m.toArray().filter((iv) => {
      const clippedStart = iv.start < this.startingAt ? this.startingAt : iv.start
      return clippedStart === rResult.start && iv.end === rResult.end
    })
    expect(candidates.some(c => c.data === rResult.data)).toBe(true)
  }

  toString = () => `findOneByLengthStartingAt(${this.minLength}, ${this.startingAt})`
}

class SearchByLengthStartingAtCommand implements fc.Command<ArrayIntervalCollection, IntervalTree> {
  minLength: number
  startingAt: number

  constructor(minLength: number, startingAt: number) {
    this.minLength = minLength
    this.startingAt = startingAt
  }

  check = () => true

  run(m: ArrayIntervalCollection, r: IntervalTree): void {
    const rResult = r.searchByLengthStartingAt(this.minLength, this.startingAt)
    const mResult = m.searchByLengthStartingAt(this.minLength, this.startingAt)
    expect(canon(rResult)).toEqual(canon(mResult))
  }

  toString = () => `searchByLengthStartingAt(${this.minLength}, ${this.startingAt})`
}

class SizeConsistencyCommand implements fc.Command<ArrayIntervalCollection, IntervalTree> {
  check = () => true

  run(m: ArrayIntervalCollection, r: IntervalTree): void {
    expect(r.size).toEqual(m.size)
  }

  toString = () => `sizeCheck()`
}

class MergeOverlapsCommand implements fc.Command<ArrayIntervalCollection, IntervalTree> {
  check(m: ArrayIntervalCollection) {
    return m.size > 0
  }

  run(m: ArrayIntervalCollection, r: IntervalTree): void {
    // data retention among tied bounds is unspecified (see mergeOverlaps()
    // JSDoc), so check bounds exactly, then check data by membership.
    const preMerge = m.toArray().slice()
    r.mergeOverlaps()
    m.mergeOverlaps()
    expect(canonBounds(r.toArray())).toEqual(canonBounds(m.toArray()))
    expect(r.size).toEqual(m.size)
    for (const iv of r.toArray()) {
      const candidates = preMerge.filter(pre => pre.start === iv.start)
      expect(candidates.some(c => c.data === iv.data)).toBe(true)
    }
    // Tie data is unspecified by contract; the model adopts the tree's legal
    // choice so later strict comparisons stay meaningful.
    for (const rIv of r.toArray()) {
      const mIv = m.toArray().find(iv => iv.start === rIv.start)!
      if (mIv.data !== rIv.data) {
        m.remove(mIv)
        m.add(new Interval(mIv.start, mIv.end, rIv.data))
      }
    }
    expect(canon(r.toArray())).toEqual(canon(m.toArray()))
  }

  toString = () => `mergeOverlaps()`
}

class SearchOverlapCommand implements fc.Command<ArrayIntervalCollection, IntervalTree> {
  start: number
  end: number

  constructor(value: { start: number, end: number }) {
    this.start = value.start
    this.end = value.end
  }

  check = () => true

  run(m: ArrayIntervalCollection, r: IntervalTree): void {
    const rResult = r.searchOverlap(this.start, this.end)
    // ArrayIntervalCollection doesn't have searchOverlap, use filter
    const mResult = m.toArray().filter(iv => iv.start < this.end && iv.end > this.start)
    expect(canon(rResult)).toEqual(canon(mResult))
  }

  toString = () => `searchOverlap(${this.start}, ${this.end})`
}

// Shared references so equal-bounds intervals with equal object data are also
// reference-equal — required for the tree's reference-equality dedup checks
// to ever fire under random input. Recreating `{ id: 1 }` per interval would
// silently break that.
const DATA_POOL = [undefined, 'a', 'b', { id: 1 }] as const

const intervalArbitrary = fc.integer({ max: 2147483647 - 1 }).chain(start =>
  fc.record({
    start: fc.constant(start),
    end: fc.integer({ min: start + 1 }),
    data: fc.constantFrom(...DATA_POOL),
  }),
)

// Fractional bounds — the integer arbitrary above never produces these, but
// the README's date examples do, so exercise them here too.
const floatIntervalArbitrary = fc.double({ noNaN: true, noDefaultInfinity: true, min: -1e6, max: 1e6 }).chain(start =>
  fc.record({
    start: fc.constant(start),
    end: fc.double({ min: 1e-3, max: 1e6, noNaN: true }).map(delta => start + delta),
    data: fc.constantFrom(...DATA_POOL),
  }),
)

class ChopAllCommand implements fc.Command<ArrayIntervalCollection, IntervalTree> {
  ranges: Array<[number, number]>

  constructor(ranges: Array<{ start: number, end: number }>) {
    this.ranges = ranges.map(r => [r.start, r.end])
  }

  check(m: ArrayIntervalCollection) {
    return m.size > 0
  }

  run(m: ArrayIntervalCollection, r: IntervalTree): void {
    r.chopAll(this.ranges)
    for (const [start, end] of this.ranges) {
      m.chop(start, end)
    }
    expect(canon(r.toArray())).toEqual(canon(m.toArray()))
    expect(r.size).toEqual(m.size)
  }

  toString = () => `chopAll(${this.ranges.length} ranges)`
}

class CloneCommand implements fc.Command<ArrayIntervalCollection, IntervalTree> {
  check = () => true

  run(_m: ArrayIntervalCollection, r: IntervalTree): void {
    const cloned = r.clone()
    expect(canon(cloned.toArray())).toEqual(canon(r.toArray()))
    expect(cloned.size).toEqual(r.size)
    cloned.verify()
    // Mutation on clone must not corrupt invariants — guards against missing
    // height propagation in clone() (regression: see cloneHeight.spec.ts).
    if (cloned.size > 0) {
      const first = cloned.first()!
      cloned.chop(first.start, first.start + 1)
      cloned.verify()
    }
  }

  toString = () => `clone()`
}

class SearchEnvelopCommand implements fc.Command<ArrayIntervalCollection, IntervalTree> {
  start: number
  end: number

  constructor(value: { start: number, end: number }) {
    this.start = value.start
    this.end = value.end
  }

  check = () => true

  run(m: ArrayIntervalCollection, r: IntervalTree): void {
    const rResult = r.searchEnveloped(this.start, this.end)
    const mResult = m.toArray()
      .filter(iv => iv.start >= this.start && iv.end <= this.end)
    expect(canon(rResult)).toEqual(canon(mResult))
  }

  toString = () => `searchEnveloped(${this.start}, ${this.end})`
}

class FindOneWithFilterCommand implements fc.Command<ArrayIntervalCollection, IntervalTree> {
  minLength: number
  startingAt: number

  constructor(minLength: number, startingAt: number) {
    this.minLength = minLength
    this.startingAt = startingAt
  }

  check = () => true

  run(m: ArrayIntervalCollection, r: IntervalTree): void {
    // Verify findOneByLengthStartingAt against model: find qualifying intervals manually
    const result = r.findOneByLengthStartingAt(this.minLength, this.startingAt)
    const qualifying = m.toArray()
      .filter((iv) => {
        const adjustedLength = iv.end - Math.max(iv.start, this.startingAt)
        return iv.end > this.startingAt && adjustedLength >= this.minLength
      })
      .sort((a, b) => a.start - b.start || a.end - b.end)

    if (qualifying.length === 0) {
      expect(result).toBeUndefined()
    }
    else {
      expect(result).toBeDefined()
      // Result start should be adjusted to startingAt if interval begins earlier
      const expectedStart = Math.max(qualifying[0].start, this.startingAt)
      expect(result!.start).toEqual(expectedStart)
    }
  }

  toString = () => `findOneWithFilter(${this.minLength}, ${this.startingAt})`
}

class FirstLastCommand implements fc.Command<ArrayIntervalCollection, IntervalTree> {
  check = () => true

  run(m: ArrayIntervalCollection, r: IntervalTree): void {
    const sorted = m.toSorted()
    if (sorted.length === 0) {
      expect(r.first()).toBeNull()
      expect(r.last()).toBeNull()
      expect(r.isEmpty).toBe(true)
    }
    else {
      const first = r.first()
      const last = r.last()
      expect(first).not.toBeNull()
      expect(last).not.toBeNull()

      // Bounds are exact; among identical bounds, data choice is unspecified
      // (see first()/last() JSDoc), so check data by membership.
      const firstExpected = sorted[0]
      expect(first!.start).toBe(firstExpected.start)
      expect(first!.end).toBe(firstExpected.end)
      const firstCandidates = m.toArray().filter(iv => iv.start === first!.start && iv.end === first!.end)
      expect(firstCandidates.some(c => c.data === first!.data)).toBe(true)

      const lastExpected = sorted[sorted.length - 1]
      expect(last!.start).toBe(lastExpected.start)
      expect(last!.end).toBe(lastExpected.end)
      const lastCandidates = m.toArray().filter(iv => iv.start === last!.start && iv.end === last!.end)
      expect(lastCandidates.some(c => c.data === last!.data)).toBe(true)

      expect(r.isEmpty).toBe(false)
    }
  }

  toString = () => `firstLast()`
}

class ContainsOverlapsCommand implements fc.Command<ArrayIntervalCollection, IntervalTree> {
  point: number
  start: number
  end: number

  constructor(point: number, range: { start: number, end: number }) {
    this.point = point
    this.start = range.start
    this.end = range.end
  }

  check = () => true

  run(m: ArrayIntervalCollection, r: IntervalTree): void {
    // contains should match searchPoint
    const searchResult = m.searchPoint(this.point)
    expect(r.contains(this.point)).toBe(searchResult.length > 0)

    // overlaps should match searchOverlap
    const overlapResult = m.toArray().filter(iv => iv.start < this.end && iv.end > this.start)
    expect(r.overlaps(this.start, this.end)).toBe(overlapResult.length > 0)
  }

  toString = () => `containsOverlaps(${this.point}, ${this.start}, ${this.end})`
}

class RemoveEnvelopedCommand implements fc.Command<ArrayIntervalCollection, IntervalTree> {
  start: number
  end: number

  constructor(value: { start: number, end: number }) {
    this.start = value.start
    this.end = value.end
  }

  check(m: ArrayIntervalCollection) {
    return m.size > 0
  }

  run(m: ArrayIntervalCollection, r: IntervalTree): void {
    // Find enveloped intervals in model, remove them
    const enveloped = m.toArray().filter(iv => iv.start >= this.start && iv.end <= this.end)
    for (const iv of enveloped) {
      m.remove(iv)
    }
    r.removeEnveloped(this.start, this.end)

    expect(canon(r.toArray())).toEqual(canon(m.toArray()))
    expect(r.size).toEqual(m.size)
  }

  toString = () => `removeEnveloped(${this.start}, ${this.end})`
}

class DifferenceCommand implements fc.Command<ArrayIntervalCollection, IntervalTree> {
  others: Array<[number, number]>

  constructor(others: Array<{ start: number, end: number }>) {
    this.others = others.map(r => [r.start, r.end])
  }

  check = () => true

  run(m: ArrayIntervalCollection, r: IntervalTree): void {
    const otherTree = IntervalTree.fromTuples(this.others)
    const fast = r.difference(otherTree)

    // Expected: chop on Array model (avoids hitting tree rotation paths)
    const expected = new ArrayIntervalCollection()
    for (const iv of m.toArray()) {
      expected.add(iv)
    }
    for (const [s, e] of this.others) {
      if (s < e)
        expected.chop(s, e)
    }

    expect(canon(fast.toArray())).toEqual(canon(expected.toArray()))
    expect(fast.size).toEqual(expected.size)

    // Also exercise tree-side chop loop on a clone — surfaces rotation bugs
    const naive = r.clone()
    for (const [s, e] of this.others) {
      if (s < e)
        naive.chop(s, e)
    }
    expect(canon(naive.toArray())).toEqual(canon(expected.toArray()))

    // Inputs unchanged
    expect(canon(r.toArray())).toEqual(canon(m.toArray()))
  }

  toString = () => `difference(${this.others.length} ranges)`
}

class UnionCommand implements fc.Command<ArrayIntervalCollection, IntervalTree> {
  others: Array<{ start: number, end: number, data?: unknown }>

  constructor(others: Array<{ start: number, end: number, data?: unknown }>) {
    this.others = others
  }

  check = () => true

  run(m: ArrayIntervalCollection, r: IntervalTree): void {
    const otherTree = IntervalTree.fromTuples(this.others.map(o => [o.start, o.end, o.data]))
    const otherModel = new ArrayIntervalCollection()
    otherModel.addAll(this.others.map(o => new Interval(o.start, o.end, o.data)))

    const rResult = r.union(otherTree)
    const mResult = m.union(otherModel)

    expect(canon(rResult.toArray())).toEqual(canon(mResult.toArray()))
    expect(rResult.size).toEqual(mResult.size)

    // Inputs unchanged
    expect(canon(r.toArray())).toEqual(canon(m.toArray()))
  }

  toString = () => `union(${this.others.length} intervals)`
}

class RangeUnionCommand implements fc.Command<ArrayIntervalCollection, IntervalTree> {
  others: Array<{ start: number, end: number, data?: unknown }>

  constructor(others: Array<{ start: number, end: number, data?: unknown }>) {
    this.others = others
  }

  check = () => true

  run(m: ArrayIntervalCollection, r: IntervalTree): void {
    const otherTree = IntervalTree.fromTuples(this.others.map(o => [o.start, o.end, o.data]))
    const otherModel = new ArrayIntervalCollection()
    otherModel.addAll(this.others.map(o => new Interval(o.start, o.end, o.data)))

    // rangeUnion() calls mergeOverlaps() internally, whose data tie-break
    // among identical bounds is unspecified (see mergeOverlaps() JSDoc) —
    // same bounds-exact / data-by-membership rule as MergeOverlapsCommand.
    const preMerge = [...m.toArray(), ...otherModel.toArray()]

    const rResult = r.rangeUnion(otherTree)
    const mResult = m.rangeUnion(otherModel)

    expect(canonBounds(rResult.toArray())).toEqual(canonBounds(mResult.toArray()))
    expect(rResult.size).toEqual(mResult.size)
    for (const iv of rResult.toArray()) {
      const candidates = preMerge.filter(pre => pre.start === iv.start)
      expect(candidates.some(c => c.data === iv.data)).toBe(true)
    }

    // Inputs unchanged
    expect(canon(r.toArray())).toEqual(canon(m.toArray()))
  }

  toString = () => `rangeUnion(${this.others.length} intervals)`
}

class IntersectionCommand implements fc.Command<ArrayIntervalCollection, IntervalTree> {
  others: Array<{ start: number, end: number, data?: unknown }>

  constructor(others: Array<{ start: number, end: number, data?: unknown }>) {
    this.others = others
  }

  check = () => true

  run(m: ArrayIntervalCollection, r: IntervalTree): void {
    const otherTree = IntervalTree.fromTuples(this.others.map(o => [o.start, o.end, o.data]))
    const otherModel = new ArrayIntervalCollection()
    otherModel.addAll(this.others.map(o => new Interval(o.start, o.end, o.data)))

    const rResult = r.intersection(otherTree)
    const mResult = m.intersection(otherModel)

    expect(canon(rResult.toArray())).toEqual(canon(mResult.toArray()))
    expect(rResult.size).toEqual(mResult.size)

    // Inputs unchanged
    expect(canon(r.toArray())).toEqual(canon(m.toArray()))
  }

  toString = () => `intersection(${this.others.length} intervals)`
}

class EqualsCommand implements fc.Command<ArrayIntervalCollection, IntervalTree> {
  check = () => true

  run(_m: ArrayIntervalCollection, r: IntervalTree): void {
    const clone = r.clone()
    expect(r.equals(clone)).toBe(true)
    expect(clone.equals(r)).toBe(true)
  }

  toString = () => `equalsSelf()`
}

class HashCommand implements fc.Command<ArrayIntervalCollection, IntervalTree> {
  check(m: ArrayIntervalCollection) {
    // hash()/equals() are documented insertion-order sensitive when bounds
    // tie with different data (see IntervalTree.equals() JSDoc). Skip so
    // this command only asserts the well-defined (no-tie) case.
    const seen = new Set<string>()
    for (const iv of m.toArray()) {
      const key = `${iv.start},${iv.end}`
      if (seen.has(key))
        return false
      seen.add(key)
    }
    return true
  }

  run(m: ArrayIntervalCollection, r: IntervalTree): void {
    expect(r.hash()).toBe(r.clone().hash())
    const fromModel = new IntervalTree(m.toSorted())
    expect(r.hash()).toBe(fromModel.hash())
  }

  toString = () => `hash()`
}

class ToTuplesCommand implements fc.Command<ArrayIntervalCollection, IntervalTree> {
  check = () => true

  run(m: ArrayIntervalCollection, r: IntervalTree): void {
    // Compare as a multiset of stringified tuples, not the raw array: when
    // bounds tie with different data, toTuples()/toJSON() order is the same
    // unspecified tie as elsewhere, but content must still match exactly.
    const rTuples = new Set(r.toTuples().map(t => JSON.stringify(t)))
    const mTuples = new Set(m.toTuples().map(t => JSON.stringify(t)))
    expect(rTuples).toEqual(mTuples)

    const rJson = new Set(r.toJSON().map(t => JSON.stringify(t)))
    const mJson = new Set(m.toJSON().map(t => JSON.stringify(t)))
    expect(rJson).toEqual(mJson)
  }

  toString = () => `toTuplesJson()`
}

class AddAllCommand implements fc.Command<ArrayIntervalCollection, IntervalTree> {
  intervals: Interval[]

  constructor(values: Array<{ start: number, end: number, data?: unknown }>) {
    this.intervals = values.map(v => new Interval(v.start, v.end, v.data))
  }

  check = () => true

  run(m: ArrayIntervalCollection, r: IntervalTree): void {
    r.addAll(this.intervals)
    m.addAll(this.intervals)
    expect(canon(r.toArray())).toEqual(canon(m.toArray()))
    expect(r.size).toEqual(m.size)
  }

  toString = () => `addAll(${this.intervals.length} intervals)`
}

class RemoveAllCommand implements fc.Command<ArrayIntervalCollection, IntervalTree> {
  readonly seed: number

  constructor(seed: number) {
    this.seed = seed
  }

  check(m: ArrayIntervalCollection) {
    return m.size > 0
  }

  run(m: ArrayIntervalCollection, r: IntervalTree): void {
    const sorted = m.toSorted()
    const count = Math.min(sorted.length, 1 + (Math.abs(this.seed) % 5))
    let rng = prand.xoroshiro128plus(this.seed)
    const toRemove: Interval[] = []
    const usedIdx = new Set<number>()
    while (toRemove.length < count) {
      const [idx, nextRng] = prand.uniformIntDistribution(0, sorted.length - 1, rng)
      rng = nextRng
      if (!usedIdx.has(idx)) {
        usedIdx.add(idx)
        toRemove.push(sorted[idx])
      }
    }

    r.removeAll(toRemove)
    m.removeAll(toRemove)
    expect(canon(r.toArray())).toEqual(canon(m.toArray()))
    expect(r.size).toEqual(m.size)
  }

  toString = () => `removeAll(seed=${this.seed})`
}

class MapCommand implements fc.Command<ArrayIntervalCollection, IntervalTree> {
  check = () => true

  run(m: ArrayIntervalCollection, r: IntervalTree): void {
    const rResult = r.map(iv => new Interval(iv.start, iv.end + 1, iv.data))
    const mResult = new ArrayIntervalCollection()
    mResult.addAll(m.toArray().map(iv => new Interval(iv.start, iv.end + 1, iv.data)))

    expect(canon(rResult.toArray())).toEqual(canon(mResult.toArray()))
    expect(rResult.size).toEqual(mResult.size)

    // Input unchanged
    expect(canon(r.toArray())).toEqual(canon(m.toArray()))
  }

  toString = () => `map(end+1)`
}

type IntervalValue = { start: number, end: number, data?: unknown }

// Parameterized over the interval arbitrary so the same command suite can run
// against both integer bounds and float bounds (see floatIntervalArbitrary).
function buildCommands(ivArb: fc.Arbitrary<IntervalValue>) {
  return [
    ivArb.map(v => new AddCommand(v)),
    fc.integer().map(seed => new RemoveCommand(seed)),
    ivArb.map(v => new ChopCommand(v)),
    fc.integer().map(v => new SearchCommand(v)),
    fc.tuple(fc.integer({ min: 1 }), fc.integer()).map(
      ([minLength, startingAt]) => new FindOneByLengthStartingAtCommand(minLength, startingAt),
    ),
    fc.tuple(fc.integer({ min: 1 }), fc.integer()).map(
      ([minLength, startingAt]) => new SearchByLengthStartingAtCommand(minLength, startingAt),
    ),
    fc.constant(new SizeConsistencyCommand()),
    fc.constant(new MergeOverlapsCommand()),
    ivArb.map(v => new SearchOverlapCommand(v)),
    fc.array(ivArb, { minLength: 1, maxLength: 5 }).map(v => new ChopAllCommand(v)),
    fc.constant(new CloneCommand()),
    ivArb.map(v => new SearchEnvelopCommand(v)),
    fc.tuple(fc.integer({ min: 1 }), fc.integer()).map(
      ([minLength, startingAt]) => new FindOneWithFilterCommand(minLength, startingAt),
    ),
    fc.constant(new FirstLastCommand()),
    fc.tuple(fc.integer(), ivArb).map(
      ([point, range]) => new ContainsOverlapsCommand(point, range),
    ),
    ivArb.map(v => new RemoveEnvelopedCommand(v)),
    fc.array(ivArb, { minLength: 0, maxLength: 8 }).map(v => new DifferenceCommand(v)),
    fc.array(ivArb, { minLength: 0, maxLength: 8 }).map(v => new UnionCommand(v)),
    fc.array(ivArb, { minLength: 0, maxLength: 8 }).map(v => new RangeUnionCommand(v)),
    fc.array(ivArb, { minLength: 0, maxLength: 8 }).map(v => new IntersectionCommand(v)),
    fc.constant(new EqualsCommand()),
    fc.constant(new HashCommand()),
    fc.constant(new ToTuplesCommand()),
    fc.array(ivArb, { minLength: 0, maxLength: 5 }).map(v => new AddAllCommand(v)),
    fc.integer().map(seed => new RemoveAllCommand(seed)),
    fc.constant(new MapCommand()),
  ]
}

const allCommands = buildCommands(intervalArbitrary)

describe('sequential chops stress', () => {
  it('mixed ops + chop loop preserves tree invariants', () => {
    type Op
      = | { kind: 'add', iv: { start: number, end: number, data?: unknown } }
        | { kind: 'remove', seed: number }
        | { kind: 'chop', iv: { start: number, end: number, data?: unknown } }
        | { kind: 'chopAll', ranges: Array<{ start: number, end: number }> }
        | { kind: 'merge' }
        | { kind: 'cloneChop', ranges: Array<{ start: number, end: number }> }

    const opArb: fc.Arbitrary<Op> = fc.oneof(
      intervalArbitrary.map(iv => ({ kind: 'add' as const, iv })),
      fc.integer().map(seed => ({ kind: 'remove' as const, seed })),
      intervalArbitrary.map(iv => ({ kind: 'chop' as const, iv })),
      fc.array(intervalArbitrary, { minLength: 1, maxLength: 6 }).map(ranges => ({ kind: 'chopAll' as const, ranges })),
      fc.constant({ kind: 'merge' as const }),
      fc.array(intervalArbitrary, { minLength: 1, maxLength: 8 }).map(ranges => ({ kind: 'cloneChop' as const, ranges })),
    )

    fc.assert(
      fc.property(fc.array(opArb, { minLength: 10, maxLength: 60 }), (ops) => {
        const tree = new IntervalTree()
        for (const op of ops) {
          switch (op.kind) {
            case 'add':
              tree.add(new Interval(op.iv.start, op.iv.end, op.iv.data))
              break
            case 'remove':
              if (tree.size > 0) {
                const arr = tree.toSorted()
                const idx = ((op.seed % arr.length) + arr.length) % arr.length
                tree.remove(arr[idx])
              }
              break
            case 'chop':
              tree.chop(op.iv.start, op.iv.end)
              break
            case 'chopAll':
              tree.chopAll(op.ranges.map(r => [r.start, r.end]))
              break
            case 'merge':
              tree.mergeOverlaps()
              break
            case 'cloneChop': {
              const cloned = tree.clone()
              for (const r of op.ranges) {
                cloned.chop(r.start, r.end)
              }
              break
            }
          }
        }
        return true
      }),
      {
        numRuns: Number(process.env.STRESS_RUNS) || 500,
        endOnFailure: true,
        seed: process.env.FC_SEED ? Number(process.env.FC_SEED) : undefined,
        path: process.env.FC_PATH,
      },
    )
  })
})

describe('model checking', () => {
  it('intervalTree matches ArrayIntervalCollection behavior', () => {
    fc.assert(
      fc.property(fc.commands(allCommands, { size: 'xlarge' }), (cmds) => {
        const s = () => ({
          model: new ArrayIntervalCollection(),
          real: new IntervalTree(),
        })
        fc.modelRun(s, cmds)
      }),
      {
        numRuns: Number(process.env.NUM_RUNS) || 200,
        endOnFailure: !process.env.FC_SHRINK,
        seed: process.env.FC_SEED ? Number(process.env.FC_SEED) : undefined,
        path: process.env.FC_PATH,
      },
    )
  })

  it('model check with float bounds', () => {
    const floatCommands = buildCommands(floatIntervalArbitrary)
    fc.assert(
      fc.property(fc.commands(floatCommands, { size: 'xlarge' }), (cmds) => {
        const s = () => ({
          model: new ArrayIntervalCollection(),
          real: new IntervalTree(),
        })
        fc.modelRun(s, cmds)
      }),
      {
        numRuns: Math.floor((Number(process.env.NUM_RUNS) || 200) / 2),
        endOnFailure: !process.env.FC_SHRINK,
        seed: process.env.FC_SEED ? Number(process.env.FC_SEED) : undefined,
        path: process.env.FC_PATH,
      },
    )
  })
})
