import { Interval } from './Interval'
import { subtractRanges } from './rangeSubtraction'

type Range = [number, number]

function sub<T>(ivs: Interval<T>[], ranges: Range[]): Interval<T>[] {
  return subtractRanges(ivs, ranges.map(([start, end]) => ({ start, end })))
}

function tuples(ivs: Interval<unknown>[]): Range[] {
  return ivs.map(iv => [iv.start, iv.end])
}

describe('subtractRanges', () => {
  // Symptom: an empty range split an interval into a touching pair.
  it('ignores empty ranges', () => {
    const ivs = [new Interval(0, 10), new Interval(20, 30)]
    expect(tuples(sub(ivs, [[5, 5], [20, 20], [30, 30]]))).toEqual([[0, 10], [20, 30]])
  })

  it('still subtracts real ranges next to an empty one', () => {
    expect(tuples(sub([new Interval(0, 10)], [[5, 5], [3, 4]]))).toEqual([[0, 3], [4, 10]])
  })

  it('returns nothing for no intervals', () => {
    expect(sub([], [[0, 10]])).toEqual([])
  })

  it('returns the intervals unchanged for no ranges', () => {
    const ivs = [new Interval(0, 5), new Interval(10, 15)]
    expect(tuples(sub(ivs, []))).toEqual([[0, 5], [10, 15]])
  })

  it('merges touching ranges', () => {
    const ivs = [new Interval(0, 20)]
    expect(tuples(sub(ivs, [[5, 10], [10, 15]]))).toEqual([[0, 5], [15, 20]])
  })

  it('handles nested ranges', () => {
    const ivs = [new Interval(0, 20)]
    expect(tuples(sub(ivs, [[5, 15], [8, 10]]))).toEqual([[0, 5], [15, 20]])
  })

  it('ignores ranges outside every interval', () => {
    const ivs = [new Interval(10, 20)]
    expect(tuples(sub(ivs, [[0, 5], [20, 30], [40, 50]]))).toEqual([[10, 20]])
  })

  it('splits one interval into several fragments', () => {
    const ivs = [new Interval(0, 100)]
    const out = sub(ivs, [[10, 20], [30, 40], [50, 60], [70, 80]])
    expect(tuples(out)).toEqual([[0, 10], [20, 30], [40, 50], [60, 70], [80, 100]])
  })

  it('drops an interval that a range fully covers', () => {
    expect(sub([new Interval(5, 10)], [[0, 20]])).toEqual([])
  })

  it('keeps data on every fragment', () => {
    const ivs = [new Interval(0, 10, 'a'), new Interval(20, 30, 'b')]
    const out = sub(ivs, [[5, 6], [25, 26]])
    expect(out.map(iv => [iv.start, iv.end, iv.data])).toEqual([
      [0, 5, 'a'],
      [6, 10, 'a'],
      [20, 25, 'b'],
      [26, 30, 'b'],
    ])
  })

  it('accepts unsorted ranges and overlapping intervals', () => {
    const ivs = [new Interval(0, 10, 'a'), new Interval(5, 15, 'b')]
    const out = sub(ivs, [[12, 20], [3, 7], [1, 2], [6, 8]])
    expect(out.map(iv => [iv.start, iv.end, iv.data])).toEqual([
      [0, 1, 'a'],
      [2, 3, 'a'],
      [8, 10, 'a'],
      [8, 12, 'b'],
    ])
  })

  it('leaves the input arrays and tuples unchanged', () => {
    const ivs = [new Interval(0, 100)]
    const ranges: Range[] = [[50, 60], [10, 20], [15, 30], [25, 35], [90, 95]]
    const ivsSnapshot = [...ivs]
    const snapshot = structuredClone(ranges)

    sub(ivs, ranges)

    expect(ranges).toEqual(snapshot)
    expect(ivs).toEqual(ivsSnapshot)
  })
})
