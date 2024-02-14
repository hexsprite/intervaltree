import { Interval } from './Interval'
import type { IntervalCollection } from './IntervalCollection'
import { compareIntervals } from './compareIntervals'

export class ArrayIntervalCollection implements IntervalCollection {
  private intervals: Interval[]

  constructor(intervals: Interval[] = []) {
    this.intervals = intervals
  }

  clone(): IntervalCollection {
    throw new Error('Method not implemented.')
  }

  addAll(intervals: Interval[]): void {
    intervals.forEach(iv => this.add(iv))
  }

  findOneByLengthStartingAt(
    minLength: number,
    startingAt: number,
    filterFn?: ((iv: Interval) => boolean) | undefined,
  ): Interval | undefined {
    let earliestInterval: Interval | undefined

    for (let interval of this.toSorted()) {
      const intervalLength
        = interval.end - interval.start - Math.max(0, startingAt - interval.start)
      if (intervalLength >= minLength) {
        if (interval.start < startingAt && interval.end >= startingAt) {
          // Create a new interval that starts at startingAt
          interval = new Interval(startingAt, interval.end, interval.data)
        }

        if (!earliestInterval || interval.start < earliestInterval.start)
          earliestInterval = interval
      }
    }

    return earliestInterval
  }

  toArray(): Interval[] {
    return this.intervals
  }

  toSorted(): Interval[] {
    return this.intervals.toSorted(compareIntervals)
  }

  get size(): number {
    return this.intervals.length
  }

  add(interval: Interval): void {
    // don't add if exists
    if (this.intervals.some(iv => iv.equals(interval)))
      return

    this.intervals.push(interval)
  }

  addInterval(start: number, end: number, data?: any): void {
    this.add(new Interval(start, end, data))
  }

  // implement chop which remove fully any intervals that are completely contained within the given interval
  // and chops any intervals that overlap the given interval
  chop(start: number, end: number): void {
    const newIntervals = this.intervals
      .map((i) => {
        if (i.start >= end || i.end <= start)
          return i

        // skip completely contained intervals
        if (i.start >= start && i.end <= end)
          return []

        if (i.start < start && i.end > end) {
          // split
          return [new Interval(i.start, start), new Interval(end, i.end)]
        }
        if (i.start < start) {
          // chop end
          return new Interval(i.start, start)
        }
        if (i.end > end) {
          // chop start
          return new Interval(end, i.end)
        }
        return i
      })
      .flat()

    this.intervals = []
    this.addAll(newIntervals)
  }

  searchPoint(point: number): Interval[] {
    return this.intervals.filter(iv => iv.containsPoint(point))
  }

  searchByLengthStartingAt(length: number, start: number): Interval[] {
    return this.intervals.filter((iv) => {
      // Ensure the interval doesn't end before the earliest time
      if (iv.end < start)
        return false

      // Calculate the effective length of the interval considering the 'start' parameter
      const effectiveLength
        = Math.min(iv.end, start + length) - Math.max(iv.start, start)
      return effectiveLength >= length
    })
  }

  // Returns the first interval in the tree
  first(): Interval | null {
    // Implementation
    return null // Placeholder
  }

  // Generates a hash of the tree structure
  hash(): string {
    // Implementation
    return '' // Placeholder
  }

  // Merges overlapping intervals in the tree
  mergeOverlaps(): void {
    // Implementation
  }

  // Updates the tree with given intervals
  update(intervals: Interval[]): void {
    // Implementation
  }

  // Removes an interval from the tree
  remove(interval: Interval): void {
    this.intervals = this.intervals.filter(iv => !iv.equals(interval))
  }

  public toString() {
    return `IntervalTree([ ${this.toSorted()
      .map(iv => iv.toString())
      .join(', ')} ])`
  }
}
