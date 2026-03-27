// Model-based property testing using fast-check
// https://fast-check.dev/docs/advanced/model-based-testing/

import fc from 'fast-check'
import prand from 'pure-rand'
import { describe, expect, it } from 'vitest'
import { ArrayIntervalCollection } from './ArrayIntervalCollection'
import { compareIntervals } from './compareIntervals'
import { Interval } from './Interval'
import { IntervalTree } from './IntervalTree'

class AddCommand implements fc.Command<ArrayIntervalCollection, IntervalTree> {
  interval: Interval

  constructor(value: { start: number, end: number }) {
    this.interval = new Interval(value.start, value.end)
  }

  check = () => true

  run(m: ArrayIntervalCollection, r: IntervalTree): void {
    r.add(this.interval)
    m.add(this.interval)
    expect(r.toString()).toEqual(m.toString())
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

    expect(r.toString()).toEqual(m.toString())
  }

  toString = () => `remove(seed=${this.seed}, index=${this.index})`
}

class ChopCommand implements fc.Command<ArrayIntervalCollection, IntervalTree> {
  interval: Interval

  constructor(value: { start: number, end: number }) {
    this.interval = new Interval(value.start, value.end)
  }

  check(m: ArrayIntervalCollection) {
    return m.size > 0
  }

  run(m: ArrayIntervalCollection, r: IntervalTree): void {
    r.chop(this.interval.start, this.interval.end)
    m.chop(this.interval.start, this.interval.end)
    r.verify()

    expect(r.toString()).toEqual(m.toString())
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
    const rSorted = r.searchPoint(this.value).toSorted(compareIntervals)
    const mSorted = m.searchPoint(this.value).toSorted(compareIntervals)
    expect(rSorted).toEqual(mSorted)
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
    expect(rResult).toEqual(mResult)
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
    // Tree adjusts intervals starting before startingAt; array returns originals.
    // Compare by end values and count, since that's what both agree on.
    const rEnds = rResult.map(iv => iv.end).sort((a, b) => a - b)
    const mEnds = mResult.map(iv => iv.end).sort((a, b) => a - b)
    expect(rEnds).toEqual(mEnds)
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
    r.mergeOverlaps()
    m.mergeOverlaps()
    expect(r.toString()).toEqual(m.toString())
    expect(r.size).toEqual(m.size)
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
    const rResult = r.searchOverlap(this.start, this.end).toSorted(compareIntervals)
    // ArrayIntervalCollection doesn't have searchOverlap, use filter
    const mResult = m.toArray().filter(iv => iv.start < this.end && iv.end > this.start).toSorted(compareIntervals)
    expect(rResult).toEqual(mResult)
  }

  toString = () => `searchOverlap(${this.start}, ${this.end})`
}

const intervalArbitrary = fc.integer({ max: 2147483647 - 1 }).chain(start =>
  fc.record({
    start: fc.constant(start),
    end: fc.integer({ min: start + 1 }),
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
    expect(r.toString()).toEqual(m.toString())
    expect(r.size).toEqual(m.size)
  }

  toString = () => `chopAll(${this.ranges.length} ranges)`
}

class CloneCommand implements fc.Command<ArrayIntervalCollection, IntervalTree> {
  check = () => true

  run(_m: ArrayIntervalCollection, r: IntervalTree): void {
    const cloned = r.clone()
    expect(cloned.toString()).toEqual(r.toString())
    expect(cloned.size).toEqual(r.size)
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
    const rResult = r.searchEnvelop(this.start, this.end).toSorted(compareIntervals)
    const mResult = m.toArray()
      .filter(iv => iv.start >= this.start && iv.end <= this.end)
      .toSorted(compareIntervals)
    expect(rResult).toEqual(mResult)
  }

  toString = () => `searchEnvelop(${this.start}, ${this.end})`
}

class FindFirstByLengthCommand implements fc.Command<ArrayIntervalCollection, IntervalTree> {
  minLength: number
  startingAt: number

  constructor(minLength: number, startingAt: number) {
    this.minLength = minLength
    this.startingAt = startingAt
  }

  check = () => true

  run(m: ArrayIntervalCollection, r: IntervalTree): void {
    const rResult = r.findFirstByLengthStartingAt(this.minLength, this.startingAt)
    // findFirst should return same result as findOne (both find earliest qualifying)
    const rOneResult = r.findOneByLengthStartingAt(this.minLength, this.startingAt)
    // Both should agree on finding/not finding a result, and on the start
    // (end may differ for same-start intervals since findFirst takes first in values,
    //  findOne picks smallest end)
    if (rResult && rOneResult) {
      expect(rResult.start).toEqual(rOneResult.start)
    }
    else {
      // Both undefined or both defined
      expect(!!rResult).toEqual(!!rOneResult)
    }
  }

  toString = () => `findFirst(${this.minLength}, ${this.startingAt})`
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
      // first() returns interval with smallest start
      expect(first!.start).toBe(sorted[0].start)
      // last() returns interval with largest start
      expect(last!.start).toBe(sorted[sorted.length - 1].start)
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

    expect(r.toString()).toEqual(m.toString())
    expect(r.size).toEqual(m.size)
  }

  toString = () => `removeEnveloped(${this.start}, ${this.end})`
}

const allCommands = [
  intervalArbitrary.map(v => new AddCommand(v)),
  fc.integer().map(seed => new RemoveCommand(seed)),
  intervalArbitrary.map(v => new ChopCommand(v)),
  fc.integer().map(v => new SearchCommand(v)),
  fc.tuple(fc.integer({ min: 1 }), fc.integer()).map(
    ([minLength, startingAt]) => new FindOneByLengthStartingAtCommand(minLength, startingAt),
  ),
  fc.tuple(fc.integer({ min: 1 }), fc.integer()).map(
    ([minLength, startingAt]) => new SearchByLengthStartingAtCommand(minLength, startingAt),
  ),
  fc.constant(new SizeConsistencyCommand()),
  fc.constant(new MergeOverlapsCommand()),
  intervalArbitrary.map(v => new SearchOverlapCommand(v)),
  fc.array(intervalArbitrary, { minLength: 1, maxLength: 5 }).map(v => new ChopAllCommand(v)),
  fc.constant(new CloneCommand()),
  intervalArbitrary.map(v => new SearchEnvelopCommand(v)),
  fc.tuple(fc.integer({ min: 1 }), fc.integer()).map(
    ([minLength, startingAt]) => new FindFirstByLengthCommand(minLength, startingAt),
  ),
  fc.constant(new FirstLastCommand()),
  fc.tuple(fc.integer(), intervalArbitrary).map(
    ([point, range]) => new ContainsOverlapsCommand(point, range),
  ),
  intervalArbitrary.map(v => new RemoveEnvelopedCommand(v)),
]

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
        numRuns: 200,
        endOnFailure: true,
      },
    )
  })
})
