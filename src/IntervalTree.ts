/* eslint-disable node/prefer-global/process */
import type { IntervalCollection } from './IntervalCollection'
import type { IntervalTuple } from './types'

import assert from 'node:assert'
import crypto from 'node:crypto'
import { compareIntervals } from './compareIntervals'
import { Interval } from './Interval'
import { _flags, Node } from './Node'

const DEBUG = process.env.NODE_ENV !== 'production'

export class IntervalTree<T = unknown> implements IntervalCollection<T> {
  private root: Node<T> | null = null
  private _dirty = false
  private _size = 0

  constructor(intervals: Interval<T>[] = []) {
    if (intervals.length > 0) {
      this.root = Node.fromIntervals(intervals)
      this._dirty = true
      this._size = this.root.countIntervals()
    }
  }

  public get size(): number {
    return this._size
  }

  /** Whether the tree contains zero intervals. */
  public get isEmpty(): boolean {
    return this.root === null
  }

  /**
   * Returns the interval(s) with the smallest start value, or null if empty.
   * O(log n) — walks left branch without materializing the full tree.
   */
  public first(): Interval<T> | null {
    if (!this.root)
      return null
    const node = this.root.min()
    return node.values[0] ?? null
  }

  /**
   * Returns the interval(s) with the largest start value, or null if empty.
   * O(log n) — walks right branch without materializing the full tree.
   */
  public last(): Interval<T> | null {
    if (!this.root)
      return null
    const node = this.root.max()
    return node.values[0] ?? null
  }

  static fromTuples<T = unknown>(allIntervals: Array<[number, number] | [number, number, T]>): IntervalTree<T> {
    return new IntervalTree(
      allIntervals.map(([start, end, data]) => new Interval(start, end, data)),
    )
  }

  public add(interval: Interval<T>): void {
    if (!this.root) {
      this.root = new Node(interval)
      this._size = 1
    }
    else {
      this.root = this.root.insert(interval)
      if (!_flags.insertWasDuplicate)
        this._size++
    }
    this._dirty = true
    this.verify()
  }

  public mergeOverlaps(): void {
    if (!this.root || !this._dirty)
      return

    // toArray() already returns in-order (sorted by start)
    const intervals = this.toArray()

    // Merge overlapping intervals in a single pass
    const merged = [intervals[0]]
    for (let i = 1; i < intervals.length; i++) {
      const current = intervals[i]
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
    this.root = Node.fromSortedIntervals(merged)
    this._size = merged.length
    this._dirty = false
    this.verify()
  }

  /**
   * SHA-256 hash of the canonical interval list. Same hash ⇔ same sorted
   * intervals (insensitive to internal tree topology because it's computed
   * over `toJSON()`, not the raw object graph). Suitable for both
   * single-tree change detection and cross-tree equality.
   */
  public hash(): string {
    const hash = crypto.createHash('sha256')
    hash.update(JSON.stringify(this))
    return hash.digest('hex')
  }

  /**
   * True when two trees represent the same set of (start, end, data)
   * intervals in sorted order. Short-circuits on size, then compares
   * element-wise — faster than hashing both trees when inequality is
   * likely (early exit on first mismatch).
   */
  public equals(other: IntervalTree<T>): boolean {
    if (this === other) return true
    if (this._size !== other._size) return false
    const a = this.toArray()
    const b = other.toArray()
    for (let i = 0; i < a.length; i++) {
      if (
        a[i].start !== b[i].start ||
        a[i].end !== b[i].end ||
        a[i].data !== b[i].data
      ) {
        return false
      }
    }
    return true
  }

  public searchPoint(point: number): Interval<T>[] {
    if (!this.root)
      return []
    const result: Interval<T>[] = []
    this.root.searchPoint(point, result)
    return result
  }

  /** Whether any interval in the tree contains the given point. */
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
    if (!this.root)
      return

    // Single searchOverlap to find all affected intervals
    const overlapping = this.root.searchOverlap(start, end)
    if (overlapping.length === 0)
      return

    // Chop never creates overlaps — preserve dirty state so mergeOverlaps
    // doesn't unnecessarily rebuild after every chop
    const wasDirty = this._dirty

    // Remove all overlapping, then add trimmed flanks
    for (let i = 0; i < overlapping.length; i++) {
      this.remove(overlapping[i])
    }
    for (let i = 0; i < overlapping.length; i++) {
      const iv = overlapping[i]
      if (iv.start < start) {
        this.add(new Interval(iv.start, start, iv.data))
      }
      if (iv.end > end) {
        this.add(new Interval(end, iv.end, iv.data))
      }
    }

    // Restore dirty state — chop only splits intervals, never creates overlaps
    this._dirty = wasDirty

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
    if (ranges.length === 0 || !this.root)
      return

    // For small numbers of ranges, individual chops are fine
    if (ranges.length <= 3) {
      for (const [start, end] of ranges) {
        this.chop(start, end)
      }
      return
    }

    // Preserve dirty state to choose correct rebuild path
    const wasDirty = this._dirty

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

    for (let ei = 0; ei < existing.length; ei++) {
      const iv = existing[ei]
      let ivStart = iv.start
      const ivEnd = iv.end

      while (chopIdx < merged.length && merged[chopIdx][1] <= ivStart) {
        chopIdx++
      }

      let ci = chopIdx
      while (ci < merged.length && merged[ci][0] < ivEnd) {
        const cStart = merged[ci][0]
        const cEnd = merged[ci][1]
        if (ivStart < cStart) {
          result.push(new Interval(ivStart, cStart, iv.data))
        }
        ivStart = cEnd
        ci++
      }

      if (ivStart < ivEnd) {
        result.push(new Interval(ivStart, ivEnd, iv.data))
      }
    }

    if (result.length > 0) {
      if (wasDirty) {
        // Dirty tree may produce unsorted/duplicate fragments — full rebuild with dedup
        this.root = Node.fromIntervals(result)
        this._size = this.root.countIntervals()
      }
      else {
        // Clean tree produces sorted, unique fragments — fast path
        this.root = Node.fromSortedIntervals(result)
        this._size = result.length
      }
    }
    else {
      this.root = null
      this._size = 0
    }
    // Preserve dirty state — chopAll doesn't merge overlaps
    this._dirty = wasDirty
    this.verify()
  }

  public removeEnveloped(start: number, end: number): void {
    if (!this.root)
      return
    // FIXME: This is not efficient, but it works.
    const toRemove = this.searchEnveloped(start, end)
    this.removeAll(toRemove)
  }

  /**
   * Searches for intervals that are completely enveloped by the specified range.
   */
  public searchEnveloped(start: number, end: number): Interval<T>[] {
    if (!this.root)
      return []
    // quick and dirty, but works
    return this.searchOverlap(start, end).filter(iv => iv.start >= start && iv.end <= end)
  }

  public remove(interval: Interval<T>): void {
    if (!this.root)
      return
    this.root = this.root.remove(interval)
    if (_flags.removeSucceeded)
      this._size--
    this._dirty = true
    this.verify()
  }

  public removeAll(intervals: Interval<T>[]): void {
    intervals.forEach((iv) => {
      this.remove(iv)
    })
  }

  public printStructure(): void {
    if (!this.root) {
      console.error('IntervalTree(<empty>)')
      return
    }

    this.root.printStructure()
  }

  public toArray(): Interval<T>[] {
    if (!this.root)
      return []
    return this.root.toArray()
  }

  public addInterval(start: number, end: number, data?: T): void {
    this.add(new Interval(start, end, data))
  }

  public toString(): string {
    return `IntervalTree([ ${this.toSorted()
      .map(iv => iv.toString())
      .join(', ')} ])`
  }

  [Symbol.toPrimitive]() {
    return this.toString()
  }

  /**
   * Canonical JSON serialization: sorted intervals as [start, end, data]
   * tuples. `JSON.stringify(tree)` will produce this form.
   *
   * Why this matters: hash() digests JSON.stringify(this). Without toJSON,
   * JSON.stringify would serialize the raw {root, _size, _dirty} object
   * graph — making hash() sensitive to internal tree topology, so two
   * trees with byte-identical intervals built via different op sequences
   * produced different hashes. With toJSON, hash() becomes semantic.
   */
  public toJSON(): Array<[number, number, T | undefined]> {
    return this.toSorted().map(iv => [iv.start, iv.end, iv.data])
  }

  /**
   * Find the first (earliest start) interval with at least `minLength` available
   * starting at or after `startingAt`. O(log n) best case via in-order traversal
   * with early termination.
   *
   * If the found interval starts before `startingAt`, the returned interval is
   * adjusted to begin at `startingAt`.
   *
   * @param minLength - The minimum length of the interval to search for.
   * @param startingAt - The earliest start position to consider.
   * @param filterFn - An optional filter function to further refine the search.
   * @returns The first matching interval, or undefined if none found.
   */
  public findOneByLengthStartingAt(
    minLength: number,
    startingAt: number,
    filterFn?: (iv: Interval<T>) => boolean,
  ): Interval<T> | undefined {
    assert(minLength > 0, 'minLength must be > 0')
    return this.root?.findOneByLengthStartingAt(minLength, startingAt, filterFn)
  }

  /**
   * Searches for intervals with at least `minLength` available starting at or after `startingAt`.
   * @param minLength The minimum length of the intervals to search for.
   * @param startingAt The earliest start position to consider.
   * @returns An array of matching intervals.
   */
  public searchByLengthStartingAt(minLength: number, startingAt: number): Interval<T>[] {
    if (!this.root)
      return []
    // In-order traversal with per-child pruning produces sorted results
    return this.root.searchByLengthStartingAt(minLength, startingAt, [])
  }

  public clone(): IntervalTree<T> {
    const clone = new IntervalTree<T>()
    if (this.root)
      clone.root = this.root.clone()

    clone._size = this._size
    clone._dirty = this._dirty
    clone.verify()
    return clone
  }

  // all intervals overlapping the given range.
  public searchOverlap(start: number, end: number): Interval<T>[] {
    if (!this.root)
      return []
    return this.root.searchOverlap(start, end, [])
  }

  /** Whether any interval in the tree overlaps with [start, end). */
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

  [Symbol.iterator](): Iterator<Interval<T>> {
    return this.toArray()[Symbol.iterator]()
  }

  public forEach(callback: (interval: Interval<T>, index: number) => void): void {
    this.toArray().forEach(callback)
  }

  public map<U>(callback: (interval: Interval<T>) => Interval<U>): IntervalTree<U> {
    const transformed = this.toArray().map(callback)
    return new IntervalTree<U>(transformed)
  }

  /** Returns a new tree with all intervals from both trees. */
  public union(other: IntervalTree<T>): IntervalTree<T> {
    const allIntervals = [...this.toArray(), ...other.toArray()]
    return new IntervalTree<T>(allIntervals)
  }

  /** Returns a new tree containing only the overlapping regions between intervals in both trees. */
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

  /** Returns a new tree with regions from this tree that don't overlap with the other. */
  public difference(other: IntervalTree<T>): IntervalTree<T> {
    const result = this.clone()

    // For each interval in the other tree, chop it out of our result
    for (const interval of other.toArray()) {
      result.chop(interval.start, interval.end)
    }

    return result
  }

  public verify(): void {
    if (!DEBUG)
      return
    if (!this.root)
      return
    this.root.verify()
  }
}
