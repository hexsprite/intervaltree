import fc from 'fast-check'
import { gaps } from './gaps'
import { Interval } from './Interval'
import { IntervalTree } from './IntervalTree'

it('readme example: free time around meetings', () => {
  const meetings = IntervalTree.fromTuples([
    [9, 10],
    [14, 15],
  ])

  expect(gaps(meetings, 0, 24).map(iv => iv.toTuple())).toEqual([
    [0, 9],
    [10, 14],
    [15, 24],
  ])
})

it('empty tree over [s, e) returns a single gap [s, e)', () => {
  const tree = new IntervalTree<undefined>()
  expect(gaps(tree, 5, 10)).toEqual([new Interval(5, 10)])
})

it('tree fully covering the range returns []', () => {
  const tree = IntervalTree.fromTuples([[0, 20]])
  expect(gaps(tree, 5, 10)).toEqual([])
})

it('intervals extending beyond the range are clipped', () => {
  const tree = IntervalTree.fromTuples([[-5, 3], [8, 30]])
  expect(gaps(tree, 0, 10).map(iv => iv.toTuple())).toEqual([[3, 8]])
})

it('overlapping (unmerged) input intervals are treated as merged coverage', () => {
  const tree = IntervalTree.fromTuples([[0, 5], [3, 8], [20, 25]])
  expect(gaps(tree, 0, 30).map(iv => iv.toTuple())).toEqual([
    [8, 20],
    [25, 30],
  ])
})

it('start >= end throws, matching chop', () => {
  const tree = new IntervalTree<undefined>()
  expect(() => gaps(tree, 10, 10)).toThrow('start must be < end')
  expect(() => gaps(tree, 10, 5)).toThrow('start must be < end')
})

it('gap Interval data is undefined', () => {
  const tree = IntervalTree.fromTuples<string>([[0, 5, 'meeting']])
  const result = gaps(tree, 0, 10)
  expect(result).toHaveLength(1)
  expect(result[0].data).toBeUndefined()
})

// Property: gaps(tree, start, end) matches the general-purpose
// fullRange.difference(tree) restricted to [start, end). `difference`
// already has model-checked coverage (src/modelCheck.test.ts); this proves
// the cheaper sweep in gaps.ts agrees with it.
it('matches fullRange.difference(tree) for random trees and ranges', () => {
  const intervalArbitrary = fc.integer({ min: -1000, max: 1000 }).chain(start =>
    fc.record({
      start: fc.constant(start),
      end: fc.integer({ min: start + 1, max: start + 50 }),
    }),
  )

  const rangeArbitrary = fc.integer({ min: -1000, max: 1000 }).chain(start =>
    fc.record({
      start: fc.constant(start),
      end: fc.integer({ min: start + 1, max: start + 200 }),
    }),
  )

  fc.assert(
    fc.property(
      fc.array(intervalArbitrary, { maxLength: 30 }),
      rangeArbitrary,
      (intervals, range) => {
        const tree = IntervalTree.fromTuples(
          intervals.map(iv => [iv.start, iv.end] as [number, number]),
        )
        const fullRange = IntervalTree.fromTuples([[range.start, range.end]])

        const expected = fullRange.difference(tree).toTuples().map(([s, e]) => [s, e])
        const actual = gaps(tree, range.start, range.end).map(iv => iv.toTuple())

        expect(actual).toEqual(expected)
      },
    ),
    { numRuns: 300 },
  )
})
