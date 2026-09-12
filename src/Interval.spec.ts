import { Interval } from './Interval'
import { IntervalTree } from './IntervalTree'

describe('interval numeric edge cases', () => {
  it('throws invalid null range for a NaN start', () => {
    expect(() => new Interval(Number.NaN, 10)).toThrow('invalid null range')
  })

  it('throws invalid null range for a NaN end', () => {
    expect(() => new Interval(0, Number.NaN)).toThrow('invalid null range')
  })

  it('accepts an Infinity end with Infinity length', () => {
    const iv = new Interval(0, Number.POSITIVE_INFINITY)
    expect(iv.length).toBe(Number.POSITIVE_INFINITY)
  })

  it('finds an [0, Infinity) interval by point and by overlap far from the origin', () => {
    // Interval fields are true #private, so toEqual([iv]) would pass
    // vacuously (no enumerable own properties) — assert on start/end instead.
    const iv = new Interval(0, Number.POSITIVE_INFINITY)
    const tree = new IntervalTree([iv])

    const byPoint = tree.searchPoint(1e12)
    expect(byPoint).toHaveLength(1)
    expect(byPoint[0].start).toBe(0)
    expect(byPoint[0].end).toBe(Number.POSITIVE_INFINITY)

    const byOverlap = tree.searchOverlap(5, 10)
    expect(byOverlap).toHaveLength(1)
    expect(byOverlap[0].start).toBe(0)
    expect(byOverlap[0].end).toBe(Number.POSITIVE_INFINITY)
  })

  it('contains fractional bounds up to but excluding the end', () => {
    const iv = new Interval(0.5, 1.5)
    expect(iv.containsPoint(1)).toBe(true)
    expect(iv.containsPoint(1.5)).toBe(false)
  })
})
