import { describe, expect, it } from 'vitest'
import { ArrayIntervalCollection } from './ArrayIntervalCollection'
import { Interval } from './Interval'
import { IntervalTree } from './IntervalTree'
import { clipStart, compareIntervals, isCanonical } from './order'

const bounds = (ivs: Interval[]) => ivs.map(iv => [iv.start, iv.end])

it('orders by start and end, with no data tie-break', () => {
  const a = new Interval(0, 10, 'a')
  expect(compareIntervals(a, new Interval(0, 5))).toBeGreaterThan(0)
  expect(compareIntervals(a, new Interval(0, 10, 'b'))).toBe(0)
  expect(isCanonical([new Interval(0, 5), a])).toBe(true)
  expect(isCanonical([a, new Interval(0, 5)])).toBe(false)
  expect(clipStart(a, -1)).toBe(a)
  expect(clipStart(a, 4).toTuple()).toEqual([4, 10, 'a'])
  expect(isCanonical([new Interval(-Infinity, Infinity, 'a'), new Interval(-Infinity, Infinity, 'b')])).toBe(true)
})

describe.each([{ name: 'tree', Collection: IntervalTree }, { name: 'array', Collection: ArrayIntervalCollection }])('canonical queries: $name', ({ Collection }) => {
  it('findOne selects the first returned bounds after clipping and filters stored intervals', () => {
    const c = new Collection([new Interval(0, 10, 'wide'), new Interval(3, 5, 'tight')])
    expect(c.findOneByLengthStartingAt(1, 4)?.toTuple()).toEqual([4, 5, 'tight'])
    expect(c.findOneByLengthStartingAt(1, 4, iv => iv.start === 0)?.toTuple()).toEqual([4, 10, 'wide'])
    expect(c.findOneByLengthStartingAt(1, 4, () => false)).toBeUndefined()
    expect(c.findOneByLengthStartingAt(1, 4)).toEqual(c.searchByLengthStartingAt(1, 4)[0])
    expect(() => c.findOneByLengthStartingAt(0, 4)).toThrow('minLength must be > 0')
    expect(() => c.searchByLengthStartingAt(0, 4)).toThrow('minLength must be > 0')
  })

  it('returns ordered arrays after construction, incremental insertion, and cloning', () => {
    const ivs = Array.from({ length: 64 }, (_, i) => new Interval(i, 1000))
    const bulk = new Collection(ivs)
    const added = new Collection()
    // An insertion order different from both canonical and balanced bulk order.
    for (const iv of [...ivs.filter((_, i) => i % 2), ...ivs.filter((_, i) => !(i % 2))].reverse())
      added.add(iv)
    for (const c of [bulk, added, added.clone()]) {
      expect(bounds(c.toArray())).toEqual(bounds(ivs))
      expect(bounds(c.searchPoint(500))).toEqual(bounds(ivs))
      expect(bounds(c.searchOverlap(500, 501))).toEqual(bounds(ivs))
      expect(bounds(c.searchEnveloped(0, 1000))).toEqual(bounds(ivs))
      expect(isCanonical(c.searchByLengthStartingAt(1, 500))).toBe(true)
    }
  })
})
