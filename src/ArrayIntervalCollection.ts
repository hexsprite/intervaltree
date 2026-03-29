import type { IntervalCollection } from './IntervalCollection'
import crypto from 'node:crypto'
import { compareIntervals } from './compareIntervals'
import { Interval } from './Interval'

/**
 * Naive array-based reference implementation used as the oracle model in
 * property-based tests. Optimized for readability, clarity and correctness
 * — not performance. Do not use in production.
 */
export class ArrayIntervalCollection<T = unknown> implements IntervalCollection<T> {
  private intervals: Interval<T>[]

  constructor(intervals: Interval<T>[] = []) {
    this.intervals = intervals
  }

  clone(): ArrayIntervalCollection<T> {
    return new ArrayIntervalCollection(this.intervals.slice())
  }

  addAll(intervals: Interval<T>[]): void {
    intervals.forEach(iv => this.add(iv))
  }

  findOneByLengthStartingAt(
    minLength: number,
    startingAt: number,
    _filterFn?: ((iv: Interval<T>) => boolean) | undefined,
  ): Interval<T> | undefined {
    for (const interval of this.toSorted()) {
      const intervalLength
        = interval.end - interval.start - Math.max(0, startingAt - interval.start)
      if (intervalLength >= minLength) {
        if (interval.start < startingAt && interval.end >= startingAt)
          return new Interval(startingAt, interval.end, interval.data)
        return interval
      }
    }
    return undefined
  }

  toArray(): Interval<T>[] {
    return this.intervals
  }

  toSorted(): Interval<T>[] {
    return this.intervals.toSorted(compareIntervals)
  }

  get size(): number {
    return this.intervals.length
  }

  add(interval: Interval<T>): void {
    if (this.intervals.some(iv => iv.equals(interval)))
      return

    this.intervals.push(interval)
  }

  addInterval(start: number, end: number, data?: T): void {
    this.add(new Interval(start, end, data))
  }

  chop(start: number, end: number): void {
    const newIntervals = this.intervals
      .map((i) => {
        if (i.start >= end || i.end <= start)
          return i

        if (i.start >= start && i.end <= end)
          return []

        if (i.start < start && i.end > end)
          return [new Interval<T>(i.start, start), new Interval<T>(end, i.end)]

        if (i.start < start)
          return new Interval<T>(i.start, start)

        // chop start (i.end > end must be true here)
        return new Interval<T>(end, i.end)
      })
      .flat()

    this.intervals = []
    this.addAll(newIntervals)
  }

  searchPoint(point: number): Interval<T>[] {
    return this.intervals.filter(iv => iv.containsPoint(point))
  }

  searchByLengthStartingAt(minLength: number, startingAt: number): Interval<T>[] {
    return this.intervals.filter((iv) => {
      if (iv.end < startingAt)
        return false

      const adjustedLength
        = iv.end - iv.start - Math.max(0, startingAt - iv.start)
      return adjustedLength >= minLength
    })
  }

  first(): Interval<T> | null {
    const sorted = this.toSorted()
    return sorted[0] ?? null
  }

  hash(): string {
    const hash = crypto.createHash('sha256')
    hash.update(JSON.stringify(this.toSorted()))
    return hash.digest('hex')
  }

  mergeOverlaps(): void {
    if (this.intervals.length <= 1)
      return
    const sorted = this.intervals.toSorted(compareIntervals)
    const merged: Interval<T>[] = [sorted[0]]
    for (let i = 1; i < sorted.length; i++) {
      const current = sorted[i]
      const last = merged[merged.length - 1]
      if (current.start <= last.end) {
        merged[merged.length - 1] = new Interval(
          last.start,
          Math.max(last.end, current.end),
          last.data,
        )
      }
      else {
        merged.push(current)
      }
    }
    this.intervals = merged
  }

  remove(interval: Interval<T>): void {
    this.intervals = this.intervals.filter(iv => !iv.equals(interval))
  }

  public toString() {
    return `IntervalTree([ ${this.toSorted()
      .map(iv => iv.toString())
      .join(', ')} ])`
  }
}
