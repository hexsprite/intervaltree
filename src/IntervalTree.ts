import assert from 'node:assert'
import crypto from 'node:crypto'
import process from 'node:process'

import { Interval } from './Interval'
import type { IntervalCollection } from './IntervalCollection'
import { Node } from './Node'
import { compareIntervals } from './compareIntervals'
import type { IntervalTuple } from './types'

export const DEBUG = process.env.NODE_ENV !== 'production'

export class IntervalTree implements IntervalCollection {
  private root: Node | null = null

  constructor(intervals: Interval[] = []) {
    if (intervals.length > 0)
      this.root = Node.fromIntervals(intervals)
  }

  public get size(): number {
    return this.toArray().length
  }

  static fromTuples(allIntervals: Array<[number, number]>): IntervalTree {
    return new IntervalTree(
      allIntervals.map(([start, end]) => new Interval(start, end)),
    )
  }

  public add(interval: Interval): void {
    if (!this.root)
      this.root = new Node(interval)
    else
      this.root = this.root.insert(interval)

    this.verify()
  }

  public mergeOverlaps(): void {
    if (!this.root)
      return

    const intervals = this.toArray().toSorted(compareIntervals)

    // start with first interval
    const merged = [intervals[0]]

    for (const current of intervals.slice(1)) {
      const last = merged[merged.length - 1]
      if (current.start <= last.end) {
        // Overlap detected, merge current with last
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
    this.root = Node.fromIntervals(merged)
    this.verify()
  }

  /**
   * Calculates the hash value of the IntervalTree instance.
   * @returns The hash value as a hexadecimal string.
   */
  public hash(): string {
    const hash = crypto.createHash('sha256')
    hash.update(JSON.stringify(this))
    return hash.digest('hex')
  }

  public searchPoint(point: number): Interval[] {
    if (!this.root)
      return []
    const result: Interval[] = []
    this.root.searchPoint(point, result)
    return result
  }

  /**
   * Removes intervals that overlap with the specified range and updates the
   * interval tree accordingly.
   * Like removeEnveloped(), but trims back Intervals hanging into the chopped
   * area so that nothing overlaps.
   * @param start The start of the range.
   * @param end The end of the range.
   */
  public chop(start: number, end: number): void {
    assert(start < end, 'start must be <= end')
    const insertions: Interval[] = []
    const startHits = this.searchPoint(start).filter(iv => iv.start < start)
    const endHits = this.searchPoint(end).filter(iv => iv.end > end)
    startHits.forEach((iv) => {
      insertions.push(new Interval(iv.start, start, iv.data))
    })
    endHits.forEach((iv) => {
      insertions.push(new Interval(end, iv.end, iv.data))
    })
    this.removeEnveloped(start, end)
    this.removeAll(startHits)
    this.removeAll(endHits)
    this.addAll(insertions)
    this.verify()
  }

  public addAll(intervals: Interval[]): void {
    intervals.forEach((iv) => {
      this.add(iv)
    })
  }

  public removeEnveloped(start: number, end: number): void {
    if (!this.root)
      return
    // FIXME: This is not efficient, but it works.
    const toRemove = this.searchEnvelop(start, end)
    this.removeAll(toRemove)
  }

  /**
   * Searches for intervals that are completely enveloped by the specified range.
   */
  public searchEnvelop(start: number, end: number): Interval[] {
    if (!this.root)
      return []
    // quick and dirty, but works
    return this.searchOverlap(start, end).filter(iv => iv.start >= start && iv.end <= end)
  }

  public remove(interval: Interval): void {
    if (!this.root)
      return
    this.root = this.root.remove(interval)
    this.verify()
  }

  public removeAll(intervals: Interval[]) {
    intervals.forEach((iv) => {
      this.remove(iv)
    })
  }

  public printStructure() {
    if (!this.root)
      return 'IntervalTree(<empty>)'

    this.root.printStructure()
  }

  public toArray() {
    if (!this.root)
      return []
    return this.root.toArray()
  }

  public addInterval(start: number, end: number, data?: unknown) {
    this.add(new Interval(start, end, data))
  }

  public toString() {
    return `IntervalTree([ ${this.toSorted()
      .map(iv => iv.toString())
      .join(', ')} ])`
  }

  [Symbol.toPrimitive]() {
    return this.toString()
  }

  /**
   * Finds the first interval in the tree that has a length greater than or equal to the specified minimum length,
   * starting at the specified starting time.
   *
   * @param minLength - The minimum length of the interval to search for.
   * @param startingAt - The starting time of the interval to search for.
   * @param filterFn - An optional filter function to further refine the search.
   * @returns The first interval that matches the search criteria, or undefined if no such interval is found.
   */
  public findOneByLengthStartingAt(
    minLength: number,
    startingAt: number,
    filterFn?: (iv: Interval) => boolean,
  ): Interval | undefined {
    assert(minLength > 0, 'minLength must be > 0')
    const foundInterval = this.root?.findOneByLengthStartingAt(
      minLength,
      startingAt,
      filterFn,
    )
    // adjust returned interval to match the requested start time
    if (foundInterval && foundInterval.start < startingAt)
      return new Interval(startingAt, foundInterval.end, foundInterval.data)

    return foundInterval
  }

  /**
   * Searches for intervals of a specific length starting at a given position.
   * @param length The length of the intervals to search for.
   * @param start The starting position to search from.
   * @returns An array of intervals that match the specified length and starting position.
   */
  public searchByLengthStartingAt(length: number, start: number): Interval[] {
    if (!this.root)
      return []
    return this.root.searchByLengthStartingAt(length, start, []).toSorted(compareIntervals)
  }

  public clone(): IntervalTree {
    const clone = new IntervalTree()
    if (this.root)
      clone.root = this.root.clone()

    clone.verify()
    return clone
  }

  // all intervals overlapping the given range.
  public searchOverlap(start: number, end: number): Interval[] {
    if (!this.root)
      return []
    return this.root.searchOverlap(start, end, [])
  }

  public toSorted(): Interval[] {
    return this.toArray().toSorted(compareIntervals)
  }

  public toTuples(): IntervalTuple[] {
    return this.toSorted().map(iv => iv.toTuple())
  }

  public verify() {
    if (!DEBUG)
      return
    if (!this.root)
      return
    this.root.verify()
  }
}
