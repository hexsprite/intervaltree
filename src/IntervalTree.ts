/* eslint-disable node/prefer-global/process */
import type { IntervalCollection } from './IntervalCollection'
import type { IntervalTuple } from './types'

import assert from 'node:assert'
import crypto from 'node:crypto'
import { compareIntervals } from './compareIntervals'
import { Interval } from './Interval'
import { Node } from './Node'

const DEBUG = process.env.NODE_ENV !== 'production'

export class IntervalTree<T = unknown> implements IntervalCollection<T> {
  private root: Node<T> | null = null
  private _dirty = false

  constructor(intervals: Interval<T>[] = []) {
    if (intervals.length > 0) {
      this.root = Node.fromIntervals(intervals)
      this._dirty = true
    }
  }

  public get size(): number {
    return this.toArray().length
  }

  /**
   * Returns true if the tree is empty, false otherwise.
   */
  public get isEmpty(): boolean {
    return this.root === null
  }

  static fromTuples<T = unknown>(allIntervals: Array<[number, number] | [number, number, T]>): IntervalTree<T> {
    return new IntervalTree(
      allIntervals.map(([start, end, data]) => new Interval(start, end, data)),
    )
  }

  public add(interval: Interval<T>): void {
    if (!this.root)
      this.root = new Node(interval)
    else
      this.root = this.root.insert(interval)

    this._dirty = true
    this.verify()
  }

  public mergeOverlaps(): void {
    if (!this.root || !this._dirty)
      return

    // toArray() already returns in-order (sorted by start)
    const intervals = this.toArray()

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
    this._dirty = false
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

  public searchPoint(point: number): Interval<T>[] {
    if (!this.root)
      return []
    const result: Interval<T>[] = []
    this.root.searchPoint(point, result)
    return result
  }

  /**
   * Checks if any interval in the tree contains the given point.
   * @param point The point to check
   * @returns true if any interval contains the point, false otherwise
   */
  public contains(point: number): boolean {
    return this.searchPoint(point).length > 0
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
    if (!this.root) return

    // Single searchOverlap to find all affected intervals
    const overlapping = this.root.searchOverlap(start, end)
    if (overlapping.length === 0) return

    // Classify and compute replacements in one pass
    const toRemove: Interval<T>[] = []
    const toAdd: Interval<T>[] = []
    for (const iv of overlapping) {
      toRemove.push(iv)
      // Keep the part before the chop range
      if (iv.start < start) {
        toAdd.push(new Interval(iv.start, start, iv.data))
      }
      // Keep the part after the chop range
      if (iv.end > end) {
        toAdd.push(new Interval(end, iv.end, iv.data))
      }
    }

    for (const iv of toRemove) {
      this.remove(iv)
    }
    for (const iv of toAdd) {
      this.add(iv)
    }
    this.verify()
  }

  public addAll(intervals: Interval<T>[]): void {
    intervals.forEach((iv) => {
      this.add(iv)
    })
  }

  /**
   * Batch chop: remove multiple ranges from the tree in a single operation.
   * Much faster than calling chop() N times because it does a single
   * linear sweep over sorted intervals instead of N tree modifications.
   *
   * @param ranges Array of [start, end] pairs to remove
   */
  public chopAll(ranges: Array<[number, number]>): void {
    if (ranges.length === 0 || !this.root) return

    // For small numbers of ranges, individual chops are fine
    if (ranges.length <= 3) {
      for (const [start, end] of ranges) {
        this.chop(start, end)
      }
      return
    }

    // Sort and merge overlapping chop ranges
    const sorted = ranges.slice().sort((a, b) => a[0] - b[0])
    const merged: Array<[number, number]> = [sorted[0]]
    for (let i = 1; i < sorted.length; i++) {
      const last = merged[merged.length - 1]
      if (sorted[i][0] <= last[1]) {
        last[1] = Math.max(last[1], sorted[i][1])
      }
      else {
        merged.push(sorted[i])
      }
    }

    // Get all existing intervals sorted
    // toArray() already returns in-order (sorted by start)
    const existing = this.toArray()

    // Linear sweep: subtract merged chop ranges from existing intervals
    const result: Interval<T>[] = []
    let chopIdx = 0

    for (const iv of existing) {
      let ivStart = iv.start
      const ivEnd = iv.end

      while (chopIdx < merged.length && merged[chopIdx][1] <= ivStart) {
        chopIdx++
      }

      let ci = chopIdx
      while (ci < merged.length && merged[ci][0] < ivEnd) {
        const [cStart, cEnd] = merged[ci]
        if (ivStart < cStart) {
          // Keep the part before this chop range
          result.push(new Interval(ivStart, Math.min(cStart, ivEnd), iv.data))
        }
        ivStart = Math.max(ivStart, cEnd)
        ci++
      }

      // Keep remaining part after all chops
      if (ivStart < ivEnd) {
        result.push(new Interval(ivStart, ivEnd, iv.data))
      }
    }

    this.root = result.length > 0 ? Node.fromIntervals(result) : null
    this._dirty = true
    this.verify()
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
  public searchEnvelop(start: number, end: number): Interval<T>[] {
    if (!this.root)
      return []
    // quick and dirty, but works
    return this.searchOverlap(start, end).filter(iv => iv.start >= start && iv.end <= end)
  }

  public remove(interval: Interval<T>): void {
    if (!this.root)
      return
    this.root = this.root.remove(interval)
    this._dirty = true
    this.verify()
  }

  public removeAll(intervals: Interval<T>[]) {
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

  public addInterval(start: number, end: number, data?: T) {
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
    filterFn?: (iv: Interval<T>) => boolean,
  ): Interval<T> | undefined {
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
  public searchByLengthStartingAt(length: number, start: number): Interval<T>[] {
    if (!this.root)
      return []
    // In-order traversal produces sorted results
    return this.root.searchByLengthStartingAt(length, start, [])
  }

  public clone(): IntervalTree<T> {
    const clone = new IntervalTree<T>()
    if (this.root)
      clone.root = this.root.clone()

    clone.verify()
    return clone
  }

  // all intervals overlapping the given range.
  public searchOverlap(start: number, end: number): Interval<T>[] {
    if (!this.root)
      return []
    return this.root.searchOverlap(start, end, [])
  }

  /**
   * Checks if any interval in the tree overlaps with the given range.
   * @param start The start of the range
   * @param end The end of the range
   * @returns true if any interval overlaps with the range, false otherwise
   */
  public overlaps(start: number, end: number): boolean {
    return this.searchOverlap(start, end).length > 0
  }

  public toSorted(): Interval<T>[] {
    // toArray() is in-order by start; sort fully by start then end
    return this.toArray().toSorted(compareIntervals)
  }

  public toTuples(): IntervalTuple<T>[] {
    return this.toSorted().map(iv => iv.toTuple())
  }

  /**
   * Implements the iterator protocol, allowing the tree to be iterated with for...of loops.
   */
  [Symbol.iterator](): Iterator<Interval<T>> {
    return this.toArray()[Symbol.iterator]()
  }

  /**
   * Executes a callback function for each interval in the tree.
   * @param callback Function to execute for each interval
   */
  public forEach(callback: (interval: Interval<T>, index: number) => void): void {
    this.toArray().forEach(callback)
  }

  /**
   * Creates a new tree with intervals transformed by the callback function.
   * @param callback Function that transforms each interval
   * @returns A new IntervalTree with transformed intervals
   */
  public map<U>(callback: (interval: Interval<T>) => Interval<U>): IntervalTree<U> {
    const transformed = this.toArray().map(callback)
    return new IntervalTree<U>(transformed)
  }

  /**
   * Returns the union of this tree with another tree (all intervals from both trees).
   * @param other The other interval tree
   * @returns A new IntervalTree containing all intervals from both trees
   */
  public union(other: IntervalTree<T>): IntervalTree<T> {
    const allIntervals = [...this.toArray(), ...other.toArray()]
    return new IntervalTree<T>(allIntervals)
  }

  /**
   * Returns the intersection of this tree with another tree.
   * Returns a new tree containing only the overlapping regions between intervals in both trees.
   * @param other The other interval tree
   * @returns A new IntervalTree containing intersecting regions
   */
  public intersection(other: IntervalTree<T>): IntervalTree<T> {
    const result: Interval<T>[] = []

    for (const interval of this.toArray()) {
      const overlapping = other.searchOverlap(interval.start, interval.end)
      for (const otherInterval of overlapping) {
        const start = Math.max(interval.start, otherInterval.start)
        const end = Math.min(interval.end, otherInterval.end)
        if (start < end) {
          result.push(new Interval(start, end, interval.data))
        }
      }
    }

    return new IntervalTree<T>(result)
  }

  /**
   * Returns the difference of this tree with another tree.
   * Returns a new tree containing intervals from this tree that don't overlap with the other tree.
   * @param other The other interval tree
   * @returns A new IntervalTree containing non-overlapping intervals from this tree
   */
  public difference(other: IntervalTree<T>): IntervalTree<T> {
    const result = this.clone()

    // For each interval in the other tree, chop it out of our result
    for (const interval of other.toArray()) {
      result.chop(interval.start, interval.end)
    }

    return result
  }

  public verify() {
    if (!DEBUG)
      return
    if (!this.root)
      return
    this.root.verify()
  }
}
