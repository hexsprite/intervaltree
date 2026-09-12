// Cross-implementation conformance spec for IntervalCollection.
//
// For every interface member, run the same small scenario on IntervalTree
// and ArrayIntervalCollection and check they agree on bounds and data.
// Scenarios are hand-picked to avoid intervals with identical (start, end)
// but different data — that tie order is unspecified (see modelCheck.test.ts's
// `canon` comment) and would make this spec flaky by implementation choice
// rather than by bug.
import type { IntervalCollection } from './IntervalCollection'
import { describe, expect, it } from 'vitest'
import { ArrayIntervalCollection } from './ArrayIntervalCollection'
import { Interval } from './Interval'
import { IntervalTree } from './IntervalTree'

interface Impl {
  name: string
  make: (tuples?: Array<[number, number, string?]>) => IntervalCollection<string>
}

const impls: Impl[] = [
  {
    name: 'IntervalTree',
    make: (tuples = []) => new IntervalTree<string>(tuples.map(([s, e, d]) => new Interval(s, e, d))),
  },
  {
    name: 'ArrayIntervalCollection',
    make: (tuples = []) => new ArrayIntervalCollection<string>(tuples.map(([s, e, d]) => new Interval(s, e, d))),
  },
]

// Base fixture: distinct, non-overlapping bounds — no ties.
const base: Array<[number, number, string?]> = [
  [0, 5, 'a'],
  [5, 10, 'b'],
  [12, 15, 'c'],
  [20, 30, 'd'],
]

function bounds(ivs: Interval<string>[]): Array<[number, number, string | undefined]> {
  return ivs.map(iv => [iv.start, iv.end, iv.data])
}

describe.each(impls)('intervalCollection conformance: $name', ({ make }) => {
  it('size and isEmpty', () => {
    const empty = make()
    expect(empty.size).toBe(0)
    expect(empty.isEmpty).toBe(true)

    const c = make(base)
    expect(c.size).toBe(4)
    expect(c.isEmpty).toBe(false)
  })

  it('first and last', () => {
    const c = make(base)
    expect(bounds([c.first()!])).toEqual([[0, 5, 'a']])
    expect(bounds([c.last()!])).toEqual([[20, 30, 'd']])

    const empty = make()
    expect(empty.first()).toBeNull()
    expect(empty.last()).toBeNull()
  })

  it('add', () => {
    const c = make(base)
    c.add(new Interval(40, 45, 'e'))
    expect(c.size).toBe(5)
    expect(bounds(c.searchPoint(42))).toEqual([[40, 45, 'e']])
  })

  it('addInterval', () => {
    const c = make(base)
    c.addInterval(40, 45, 'e')
    expect(bounds(c.searchPoint(42))).toEqual([[40, 45, 'e']])
  })

  it('addAll', () => {
    const c = make(base)
    c.addAll([new Interval(40, 45, 'e'), new Interval(50, 55, 'f')])
    expect(c.size).toBe(6)
  })

  it('remove', () => {
    const c = make(base)
    c.remove(new Interval(5, 10, 'b'))
    expect(c.size).toBe(3)
    expect(c.searchPoint(7)).toEqual([])
  })

  it('removeAll', () => {
    const c = make(base)
    c.removeAll([new Interval(5, 10, 'b'), new Interval(12, 15, 'c')])
    expect(c.size).toBe(2)
  })

  it('removeEnveloped', () => {
    const c = make(base)
    c.removeEnveloped(4, 16)
    // [5,10] and [12,15] are enveloped by [4,16); [0,5] and [20,30] are not.
    expect(bounds(c.toSorted())).toEqual([[0, 5, 'a'], [20, 30, 'd']])
  })

  it('chop', () => {
    const c = make(base)
    c.chop(2, 7)
    // [0,5] trims to [0,2); [5,10] trims to [7,10). [12,15] and [20,30] untouched.
    expect(bounds(c.toSorted())).toEqual([[0, 2, 'a'], [7, 10, 'b'], [12, 15, 'c'], [20, 30, 'd']])
  })

  it('chopAll', () => {
    const c = make(base)
    c.chopAll([[2, 7], [13, 14]])
    expect(bounds(c.toSorted())).toEqual([[0, 2, 'a'], [7, 10, 'b'], [12, 13, 'c'], [14, 15, 'c'], [20, 30, 'd']])
  })

  it('mergeOverlaps', () => {
    const c = make([[0, 5, 'a'], [4, 10, 'b'], [20, 30, 'd']])
    c.mergeOverlaps()
    // [0,5] and [4,10] overlap and merge, keeping the earlier-starting data.
    expect(bounds(c.toSorted())).toEqual([[0, 10, 'a'], [20, 30, 'd']])
  })

  it('searchPoint', () => {
    const c = make(base)
    expect(bounds(c.searchPoint(13))).toEqual([[12, 15, 'c']])
    expect(c.searchPoint(17)).toEqual([])
  })

  it('searchOverlap', () => {
    const c = make(base)
    expect(bounds(c.searchOverlap(4, 13))).toEqual([[0, 5, 'a'], [5, 10, 'b'], [12, 15, 'c']])
    expect(c.searchOverlap(16, 18)).toEqual([])
  })

  it('searchEnveloped', () => {
    const c = make(base)
    expect(bounds(c.searchEnveloped(4, 16))).toEqual([[5, 10, 'b'], [12, 15, 'c']])
    expect(c.searchEnveloped(1, 4)).toEqual([])
  })

  it('searchByLengthStartingAt', () => {
    const c = make(base)
    // [20,30] is the only interval with >= 8 available length.
    expect(bounds(c.searchByLengthStartingAt(8, 0))).toEqual([[20, 30, 'd']])
  })

  it('findOneByLengthStartingAt', () => {
    const c = make(base)
    const found = c.findOneByLengthStartingAt(3, 0)
    expect(bounds([found!])).toEqual([[0, 5, 'a']])
    expect(c.findOneByLengthStartingAt(100, 0)).toBeUndefined()
  })

  it('contains', () => {
    const c = make(base)
    expect(c.contains(13)).toBe(true)
    expect(c.contains(17)).toBe(false)
  })

  it('overlaps', () => {
    const c = make(base)
    expect(c.overlaps(4, 13)).toBe(true)
    expect(c.overlaps(16, 18)).toBe(false)
  })

  it('clone', () => {
    const c = make(base)
    const cloned = c.clone()
    cloned.add(new Interval(40, 45, 'e'))
    expect(c.size).toBe(4)
    expect(cloned.size).toBe(5)
    expect(bounds(cloned.toSorted())).toEqual([...bounds(c.toSorted()), [40, 45, 'e']])
  })

  it('equals', () => {
    const a = make(base)
    const b = make(base)
    expect(a.equals(b)).toBe(true)
    b.add(new Interval(40, 45, 'e'))
    expect(a.equals(b)).toBe(false)
  })

  it('hash', () => {
    const a = make(base)
    const b = make(base)
    expect(a.hash()).toBe(b.hash())
    b.add(new Interval(40, 45, 'e'))
    expect(a.hash()).not.toBe(b.hash())
  })

  it('toArray and toSorted', () => {
    const c = make(base)
    expect(bounds(c.toSorted())).toEqual(base)
    // toArray need not be sorted for every implementation, so sort before comparing.
    expect(bounds(c.toArray()).sort((x, y) => x[0] - y[0])).toEqual(base)
  })

  it('toTuples', () => {
    const c = make(base)
    expect(c.toTuples()).toEqual(base)
  })

  it('toJSON', () => {
    const c = make(base)
    expect(c.toJSON()).toEqual(base)
    expect(JSON.parse(JSON.stringify(c))).toEqual(base)
  })

  it('toString', () => {
    const c = make(base)
    const str = c.toString()
    expect(str).toContain('0')
    expect(str).toContain('a')
  })

  it('forEach', () => {
    const c = make(base)
    const seen: Array<[number, number, string | undefined]> = []
    c.forEach(iv => seen.push([iv.start, iv.end, iv.data]))
    expect(seen.sort((a, b) => a[0] - b[0])).toEqual(base)
  })

  it('[Symbol.iterator]', () => {
    const c = make(base)
    const collected = [...c]
    expect(bounds(collected).sort((a, b) => a[0] - b[0])).toEqual(base)
  })
})
