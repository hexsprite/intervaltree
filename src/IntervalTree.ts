/* eslint-disable node/prefer-global/process */
import type { IntervalCollection } from './IntervalCollection'
import type { IntervalTuple } from './types'

import { assert } from './assert'
import { compareIntervals } from './compareIntervals'
import { Interval } from './Interval'
import { subtractRanges } from './rangeSubtraction'
import { sha256 } from './sha256'
import { TreeCore } from './TreeCore'

// Automatic invariant checks after every mutation are O(n) each.
// Off by default; this repo's vitest configs set INTERVALTREE_DEBUG=1.
// `typeof process` guard keeps browser bundles from throwing on `process`.
const DEBUG = typeof process !== 'undefined' && process.env?.INTERVALTREE_DEBUG === '1'

/** Rejects inverted ranges and NaN. The `!(a <= b)` form catches NaN. */
function assertValidRange(start: number, end: number): void {
  assert(start <= end, 'start must be <= end')
}

export class IntervalTree<T = unknown> implements IntervalCollection<T> {
  private core: TreeCore<T>
  /**
   * True means mergeOverlaps() would change nothing: no two intervals overlap or touch.
   * False promises nothing. chopAll and difference rely on it to skip sorting.
   * After construction, only add (clears it) and mergeOverlaps (sets it) write it.
   */
  private merged: boolean

  constructor(intervals: Interval<T>[] = []) {
    this.core = TreeCore.from(intervals)
    this.merged = intervals.length === 0
  }

  /** Wraps a core built elsewhere, such as a clone or a set-operation result. */
  static #of<T>(core: TreeCore<T>, merged: boolean): IntervalTree<T> {
    const tree = new IntervalTree<T>()
    tree.core = core
    tree.merged = merged
    tree.verifyIfDebug()
    return tree
  }

  public get size(): number {
    return this.core.size
  }

  /** Whether the tree contains zero intervals. */
  public get isEmpty(): boolean {
    return this.core.isEmpty
  }

  /**
   * Returns the interval with the smallest (start, end), or null if empty.
   * O(log n) — walks left branch without materializing the full tree.
   * Among intervals with identical bounds the choice is unspecified.
   */
  public first(): Interval<T> | null {
    return this.core.first()
  }

  /**
   * Returns the interval with the largest (start, end), or null if empty.
   * O(log n) — walks right branch without materializing the full tree.
   * Among intervals with identical bounds the choice is unspecified.
   */
  public last(): Interval<T> | null {
    return this.core.last()
  }

  static fromTuples<T = unknown>(allIntervals: Array<[number, number] | [number, number, T]>): IntervalTree<T> {
    return new IntervalTree(
      allIntervals.map(([start, end, data]) => new Interval(start, end, data)),
    )
  }

  /**
   * Inverse of toJSON(). Accepts the JSON string or the parsed tuple array.
   * A third element of `null` (what JSON.stringify emits for absent data)
   * is normalized back to `undefined` so equals() holds after a round trip.
   */
  static fromJSON<T = unknown>(input: string | Array<[number, number] | [number, number, T | null]>): IntervalTree<T> {
    const parsed: unknown = typeof input === 'string' ? JSON.parse(input) : input
    assert(Array.isArray(parsed), 'fromJSON expects an array of [start, end, data?] tuples')
    return new IntervalTree<T>(
      parsed.map((t) => {
        assert(Array.isArray(t) && t.length >= 2, 'fromJSON expects an array of [start, end, data?] tuples')
        const [start, end, data] = t as [number, number, T | null | undefined]
        return new Interval<T>(start, end, data === null ? undefined : data)
      }),
    )
  }

  public add(interval: Interval<T>): void {
    if (this.core.insert(interval))
      this.merged = false
    this.verifyIfDebug()
  }

  /**
   * Merges overlapping (or touching) intervals in place. The merged interval
   * keeps `data` from the earliest-starting interval of the run. Among
   * intervals with identical bounds the choice is unspecified.
   */
  public mergeOverlaps(): void {
    if (this.core.isEmpty || this.merged)
      return

    // toArray() already returns in-order (sorted by start)
    const intervals = this.toArray()

    // Merge overlapping intervals in a single pass
    const runs = [intervals[0]]
    for (let i = 1; i < intervals.length; i++) {
      const current = intervals[i]
      const last = runs[runs.length - 1]
      if (current.start <= last.end) {
        // Overlap detected, merge current with last
        runs[runs.length - 1] = new Interval(
          last.start,
          Math.max(last.end, current.end),
          last.data,
        )
      }
      else {
        runs.push(current)
      }
    }
    this.core = TreeCore.fromSortedDistinctStarts(runs)
    this.merged = true
    this.verifyIfDebug()
  }

  /**
   * SHA-256 hash of the canonical interval list. Same hash ⇔ same sorted
   * intervals (insensitive to internal tree topology because it's computed
   * over `toJSON()`, not the raw object graph). Suitable for both
   * single-tree change detection and cross-tree equality.
   */
  public hash(): string {
    return sha256(JSON.stringify(this))
  }

  /**
   * True when this tree and another collection represent the same set of
   * (start, end, data) intervals in sorted order. Short-circuits on size,
   * then compares element-wise — faster than hashing both when inequality
   * is likely (early exit on first mismatch).
   * Intervals with identical start and end but different `data` compare in
   * insertion order; `equals` and `hash` are both insertion-order sensitive
   * for that case only.
   * `this.toArray()` is already in sorted order (in-order BST walk); the
   * other side may not be, so it goes through `toSorted()`.
   */
  public equals(other: IntervalCollection<T>): boolean {
    if ((this as unknown) === other)
      return true
    if (this.size !== other.size)
      return false
    const a = this.toArray()
    const b = other.toSorted()
    for (let i = 0; i < a.length; i++) {
      if (
        a[i].start !== b[i].start
        || a[i].end !== b[i].end
        || a[i].data !== b[i].data
      ) {
        return false
      }
    }
    return true
  }

  public searchPoint(point: number): Interval<T>[] {
    return this.core.searchPoint(point)
  }

  /** Whether any interval in the tree contains the given point. */
  public contains(point: number): boolean {
    return this.core.hasPoint(point)
  }

  /**
   * Removes intervals that overlap with the specified range and updates the
   * interval tree accordingly.
   * Like removeEnveloped(), but trims back Intervals hanging into the chopped
   * area so that nothing overlaps.
   *
   * An empty range (`start === end`) removes nothing, so it is a no-op.
   * @param start The start of the range.
   * @param end The end of the range.
   * @throws If `start > end` or either bound is NaN.
   */
  public chop(start: number, end: number): void {
    assertValidRange(start, end)
    if (start === end)
      return

    // Single searchOverlap to find all affected intervals
    const overlapping = this.core.searchOverlap(start, end)
    if (overlapping.length === 0)
      return

    // Remove all overlapping, then add trimmed flanks. Flanks never overlap or
    // touch anything, so chop goes to the core and leaves `merged` alone.
    for (let i = 0; i < overlapping.length; i++) {
      this.core.remove(overlapping[i])
    }
    for (let i = 0; i < overlapping.length; i++) {
      const iv = overlapping[i]
      if (iv.start < start) {
        this.core.insert(new Interval(iv.start, start, iv.data))
      }
      if (iv.end > end) {
        this.core.insert(new Interval(end, iv.end, iv.data))
      }
    }

    this.verifyIfDebug()
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
   * Empty ranges (`start === end`) are no-ops. The method checks every range
   * before it changes anything, so a thrown error leaves the tree unchanged.
   *
   * @param ranges Array of [start, end] pairs to remove
   * @throws If any range has `start > end` or a NaN bound.
   */
  public chopAll(ranges: Array<[number, number]>): void {
    for (const [start, end] of ranges)
      assertValidRange(start, end)
    if (ranges.length === 0 || this.core.isEmpty)
      return

    // For small numbers of ranges, individual chops are fine
    if (ranges.length <= 3) {
      for (const [start, end] of ranges) {
        this.chop(start, end)
      }
      return
    }

    // toArray() already returns in-order (sorted by start)
    const result = subtractRanges(this.toArray(), ranges.map(([start, end]) => ({ start, end })))

    // A merged tree produces sorted fragments with distinct starts. Any other
    // tree may produce unsorted or duplicate fragments, so it needs the full rebuild.
    this.core = this.merged ? TreeCore.fromSortedDistinctStarts(result) : TreeCore.from(result)
    this.verifyIfDebug()
  }

  /**
   * Remove all intervals fully enveloped by [start, end] in a single tree
   * walk. Branches by removed/kept ratio:
   *   - All removed → drop root.
   *   - Dense (M ≥ N/8) → second walk collects survivors, rebuild via TreeCore.from (O(N)).
   *   - Sparse → per-remove path (O(M log N) with rebalancing amortized).
   * Removing intervals never creates overlaps, so `merged` stays as it is.
   */
  public removeEnveloped(start: number, end: number): void {
    const removed = this.core.searchEnveloped(start, end)
    if (removed.length === 0)
      return

    if (removed.length === this.core.size) {
      this.core = TreeCore.from([])
    }
    else if (removed.length * 8 >= this.core.size) {
      this.core = TreeCore.from(this.core.collectNonEnveloped(start, end))
    }
    else {
      for (let i = 0; i < removed.length; i++) {
        this.core.remove(removed[i])
      }
    }

    this.verifyIfDebug()
  }

  /**
   * Searches for intervals that are completely enveloped by the specified range.
   * Single tree walk with subtree pruning — see Node.searchEnveloped in TreeCore.ts.
   */
  public searchEnveloped(start: number, end: number): Interval<T>[] {
    return this.core.searchEnveloped(start, end)
  }

  public remove(interval: Interval<T>): void {
    // Removing an interval never creates an overlap, so `merged` stays as it is.
    this.core.remove(interval)
    this.verifyIfDebug()
  }

  public removeAll(intervals: Interval<T>[]): void {
    intervals.forEach((iv) => {
      this.remove(iv)
    })
  }

  public printStructure(): void {
    this.core.printStructure()
  }

  public toArray(): Interval<T>[] {
    return this.core.toArray()
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
   * JSON.stringify would serialize the raw {core, merged} object
   * graph — making hash() sensitive to internal tree topology, so two
   * trees with byte-identical intervals built via different op sequences
   * produced different hashes. With toJSON, hash() becomes semantic.
   */
  public toJSON(): Array<[number, number, T | undefined]> {
    return this.toSorted().map(iv => [iv.start, iv.end, iv.data])
  }

  /**
   * Returns the first canonical result with at least `minLength` remaining
   * after `startingAt`. Results starting earlier are clipped to `startingAt`.
   * Ties on clipped start choose the smallest end; identical bounds are unordered.
   * O(log n + k) without a filter, where k counts qualifying intervals containing
   * startingAt. A filter can require scanning O(n) intervals.
   *
   * `filterFn` receives the stored interval, not the clipped result.
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
    return this.core.findOneByLengthStartingAt(minLength, startingAt, filterFn)
  }

  /**
   * Searches for stored intervals with at least `minLength` remaining after `startingAt`.
   * @param minLength The minimum length of the intervals to search for.
   * @param startingAt The earliest start position to consider.
   * @returns An array of matching intervals.
   */
  public searchByLengthStartingAt(minLength: number, startingAt: number): Interval<T>[] {
    assert(minLength > 0, 'minLength must be > 0')
    // The core walks in order by ORIGINAL start; clipping to startingAt
    // can reorder ties, so sort the (small) result.
    return this.core.searchByLengthStartingAt(minLength, startingAt).sort(compareIntervals)
  }

  public clone(): IntervalTree<T> {
    return IntervalTree.#of(this.core.clone(), this.merged)
  }

  // all intervals overlapping the given range.
  public searchOverlap(start: number, end: number): Interval<T>[] {
    return this.core.searchOverlap(start, end)
  }

  /** Whether any interval in the tree overlaps with [start, end). */
  public overlaps(start: number, end: number): boolean {
    return this.core.hasOverlap(start, end)
  }

  public toSorted(): Interval<T>[] {
    return this.toArray()
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

  /** Returns a new tree with all overlapping or adjacent ranges merged. */
  public rangeUnion(other: IntervalTree<T>): IntervalTree<T> {
    const result = this.union(other)
    result.mergeOverlaps()
    return result
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
    // Fast path: empty trees
    if (this.isEmpty || other.isEmpty)
      return this.clone()

    // When other is much smaller than this, the sweep's O(this.size) cost
    // dominates. Fall back to per-chop loop, which is O(other.size × log this.size).
    // Threshold tuned via bench: naive wins when other.size * 20 < this.size.
    if (other.size * 20 < this.size) {
      const result = this.clone()
      for (const iv of other.toArray()) {
        result.chop(iv.start, iv.end)
      }
      return result
    }

    const result = subtractRanges(this.toArray(), other.toArray())
    // A merged tree gives fragments sorted with distinct starts.
    const core = this.merged ? TreeCore.fromSortedDistinctStarts(result) : TreeCore.from(result)
    return IntervalTree.#of(core, this.merged)
  }

  private verifyIfDebug(): void {
    if (DEBUG)
      this.verify()
  }

  /**
   * Check every AVL and augmentation invariant, the cached size, and the merged-tree rule.
   * Read-only. Throws on the first violation. O(n).
   */
  public verify(): void {
    this.core.verify()
    // chopAll and difference rebuild a merged tree from sorted intervals and assume no overlaps.
    // mergeOverlaps also merges touching intervals, so a merged tree needs a gap between them.
    if (this.merged) {
      const sorted = this.core.toArray()
      for (let i = 1; i < sorted.length; i++) {
        assert(
          sorted[i - 1].end < sorted[i].start,
          `clean tree holds overlapping or touching intervals ${sorted[i - 1]} and ${sorted[i]}`,
        )
      }
    }
  }
}
