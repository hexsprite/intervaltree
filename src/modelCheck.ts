// More complex Fastcheck test using model-based testing
// https://fast-check.dev/docs/advanced/model-based-testing/

import fc from 'fast-check'
import { expect } from 'expect'
import prand from 'pure-rand'
import { Interval } from './Interval'
import { IntervalTree } from './IntervalTree'
import { ArrayIntervalCollection } from './ArrayIntervalCollection'
import { compareIntervals } from './compareIntervals'

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

class RemoveCommand
implements fc.Command<ArrayIntervalCollection, IntervalTree> {
  readonly seed: number
  index = 0

  constructor(seed: number) {
    this.seed = seed
  }

  check(m: ArrayIntervalCollection) {
    return m.size > 0
  }

  run(m: ArrayIntervalCollection, r: IntervalTree): void {
    // seed the random number generator for deterministic results
    const rng = prand.xoroshiro128plus(this.seed)
    // pick a random interval to remove
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

class SearchCommand
implements fc.Command<ArrayIntervalCollection, IntervalTree> {
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

class FindOneByLengthStartingAtCommand
implements fc.Command<ArrayIntervalCollection, IntervalTree> {
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

  toString = () =>
    `findOneByLengthStartingAt(${this.minLength}, ${this.startingAt})`
}

const intervalArbitrary = fc.integer({ max: 2147483647 - 1 }).chain(start =>
  fc.record({
    start: fc.constant(start),
    // ensure a minimum length of 1
    end: fc.integer({ min: start + 1 }),
  }),
)

// const commandArbitrary = fc.oneof(intervalArbitrary.map((v) => new AddCommand(v)))
// // define the possible commands and their inputs
const allCommands = [
  // AddCommand
  intervalArbitrary.map(v => new AddCommand(v)),
  // RemoveCommand
  fc
    .integer()
    .noBias()
    // .noShrink()
    .map(seed => new RemoveCommand(seed)),
  // ChopCommand
  intervalArbitrary.map(v => new ChopCommand(v)),
  // SearchCommand
  fc.integer().map(v => new SearchCommand(v)),
  // FindOneByLengthStartingAtCommand
  fc
    .tuple(fc.integer({ min: 1 }), fc.integer())
    .map(
      ([minLength, startingAt]) =>
        new FindOneByLengthStartingAtCommand(minLength, startingAt),
    ),
]

function main() {
  // clear screen
  // eslint-disable-next-line no-console
  console.log('\x1Bc\nrunning')
  fc.assert(
    fc.property(fc.commands(allCommands, { size: 'xlarge' }), (cmds) => {
      const s = () => ({
        model: new ArrayIntervalCollection(),
        real: new IntervalTree(),
      })
      // console.log('running')
      fc.modelRun(s, cmds)
    }),
    {
      endOnFailure: true,
      numRuns: Number.POSITIVE_INFINITY,
      seed: -1823745148,
      path: '0',
    },
  )
}

main()
