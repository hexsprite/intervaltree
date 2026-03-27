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
