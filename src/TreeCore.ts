import type { Interval } from './Interval'
import { assert } from './assert'
import { compareIntervals } from './compareIntervals'
import { _flags, Node } from './Node'

/** Groups sorted intervals by start and drops repeats of the same start, end, and data. */
function groupByStart<T>(sorted: readonly Interval<T>[]): Interval<T>[][] {
  const groups: Interval<T>[][] = []
  let i = 0
  while (i < sorted.length) {
    const s = sorted[i].start
    const values: Interval<T>[] = [sorted[i]]
    const byEnd = new Map<number, Interval<T>[]>([[sorted[i].end, [sorted[i]]]])
    i++
    while (i < sorted.length && sorted[i].start === s) {
      const bucket = byEnd.get(sorted[i].end)
      if (!bucket) {
        byEnd.set(sorted[i].end, [sorted[i]])
        values.push(sorted[i])
      }
      else if (!bucket.some(iv => iv.data === sorted[i].data)) {
        bucket.push(sorted[i])
        values.push(sorted[i])
      }
      i++
    }
    groups.push(values)
  }
  return groups
}

/**
 * The augmented AVL tree: owns the root node and the interval count.
 * It stores intervals and answers searches; policy such as merging lives in IntervalTree.
 */
export class TreeCore<T> {
  private root: Node<T> | null
  private _size: number

  private constructor(root: Node<T> | null, size: number) {
    this.root = root
    this._size = size
  }

  /** Sorts, groups by start, and drops duplicates. Empty input gives an empty core. */
  static from<T>(intervals: readonly Interval<T>[]): TreeCore<T> {
    if (intervals.length === 0)
      return new TreeCore<T>(null, 0)
    const groups = groupByStart(intervals.toSorted(compareIntervals))
    let size = 0
    for (let i = 0; i < groups.length; i++)
      size += groups[i].length
    return new TreeCore(Node.build(i => Node.fromGroup(groups[i]), 0, groups.length - 1), size)
  }

  /**
   * Builds in O(n) without sorting or grouping. The caller guarantees input
   * sorted by start with distinct starts; nothing checks it here.
   */
  static fromSortedDistinctStarts<T>(sorted: readonly Interval<T>[]): TreeCore<T> {
    return new TreeCore(Node.build(i => new Node(sorted[i]), 0, sorted.length - 1), sorted.length)
  }

  get size(): number {
    return this._size
  }

  get isEmpty(): boolean {
    return this.root === null
  }

  /** @returns false when an interval with the same start, end, and data is already stored. */
  insert(interval: Interval<T>): boolean {
    if (!this.root) {
      this.root = new Node(interval)
      this._size = 1
      return true
    }
    this.root = this.root.insert(interval)
    if (_flags.insertWasDuplicate)
      return false
    this._size++
    return true
  }

  /** @returns false when no interval with the same start, end, and data is stored. */
  remove(interval: Interval<T>): boolean {
    if (!this.root)
      return false
    this.root = this.root.remove(interval)
    if (!_flags.removeSucceeded)
      return false
    this._size--
    return true
  }

  /** The interval with the smallest (start, end), or null if empty. O(log n). */
  first(): Interval<T> | null {
    return this.root ? this.root.min().values[0] : null
  }

  /** The interval with the largest (start, end), or null if empty. O(log n). */
  last(): Interval<T> | null {
    if (!this.root)
      return null
    const values = this.root.max().values
    return values[values.length - 1]
  }

  /** In order by start, then end, then insertion order. */
  toArray(): Interval<T>[] {
    return this.root ? this.root.toArray() : []
  }

  searchPoint(point: number): Interval<T>[] {
    const result: Interval<T>[] = []
    this.root?.searchPoint(point, result)
    return result
  }

  hasPoint(point: number): boolean {
    return this.root ? this.root.hasPoint(point) : false
  }

  searchOverlap(start: number, end: number): Interval<T>[] {
    return this.root ? this.root.searchOverlap(start, end, []) : []
  }

  hasOverlap(start: number, end: number): boolean {
    return this.root ? this.root.hasOverlap(start, end) : false
  }

  /** Intervals with `start >= qs && end <= qe`, in order. */
  searchEnveloped(qs: number, qe: number): Interval<T>[] {
    return this.root ? this.root.searchEnveloped(qs, qe, []) : []
  }

  /** Every interval searchEnveloped(qs, qe) leaves out, in order. */
  collectNonEnveloped(qs: number, qe: number): Interval<T>[] {
    return this.root ? this.root.collectNonEnveloped(qs, qe, []) : []
  }

  findOneByLengthStartingAt(
    minLength: number,
    startingAt: number,
    filterFn?: (iv: Interval<T>) => boolean,
  ): Interval<T> | undefined {
    return this.root?.findOneByLengthStartingAt(minLength, startingAt, filterFn)
  }

  /** In order by original start, so clipping to `startingAt` can leave ties unsorted. */
  searchByLengthStartingAt(minLength: number, startingAt: number): Interval<T>[] {
    return this.root ? this.root.searchByLengthStartingAt(minLength, startingAt, []) : []
  }

  clone(): TreeCore<T> {
    return new TreeCore(this.root?.clone() ?? null, this._size)
  }

  printStructure(): void {
    if (!this.root) {
      console.error('IntervalTree(<empty>)')
      return
    }
    this.root.printStructure()
  }

  /**
   * Checks every AVL and augmentation invariant and the cached size.
   * Read-only. Throws on the first violation. O(n).
   */
  verify(): void {
    if (!this.root) {
      assert(this._size === 0, `size is ${this._size} but the tree is empty`)
      return
    }
    const count = this.root.verify()
    assert(
      this._size === count,
      `size is ${this._size} but the tree holds ${count} intervals`,
    )
  }
}
