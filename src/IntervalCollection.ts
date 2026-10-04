import type { Interval } from './Interval'
import type { IntervalTuple } from './types'

/**
 * Full public API a mutable interval collection can implement. Widened (see
 * in-30p.16) to every IntervalTree member a generic collection can satisfy,
 * so a second implementation (e.g. a flat typed-array tree) can conform and
 * be swapped in wherever an IntervalCollection is expected.
 *
 * Every array result and iteration is in canonical order of returned bounds:
 * ascending start, then end. Identical bounds with different data are unordered.
 * `toSorted` is retained as an alias for canonical `toArray`.
 *
 * Left out on purpose:
 * - `map` — returns `IntervalTree<U>`, tying the return type to one
 *   implementation.
 * - `union` / `intersection` / `difference` / `rangeUnion` — typed to
 *   `IntervalTree<T>` for the same reason: a generic signature would force
 *   every implementation to accept and return the same interface type,
 *   which is a bigger contract change than this widening is scoped for.
 * - `verify` / `printStructure` — debug-only, specific to the AVL tree's
 *   internal structure.
 * - static factories (`fromTuples`, `fromJSON`) — statics aren't part of an
 *   interface's instance contract.
 */
export interface IntervalCollection<T = unknown> {
  size: number
  isEmpty: boolean
  first: () => Interval<T> | null
  last: () => Interval<T> | null
  add: (interval: Interval<T>) => void
  addAll: (intervals: Interval<T>[]) => void
  addInterval: (start: number, end: number, data?: T) => void
  remove: (interval: Interval<T>) => void
  removeAll: (intervals: Interval<T>[]) => void
  removeEnveloped: (start: number, end: number) => void
  /**
   * Removes [start, end) from every interval, splitting those that span it.
   * An empty range (`start === end`) is a no-op. Throws if `start > end` or a bound is NaN.
   */
  chop: (start: number, end: number) => void
  /**
   * Chops every range. An empty range is a no-op. Throws if any range has
   * `start > end` or a NaN bound. It checks all ranges first, so a throw leaves
   * the collection unchanged.
   */
  chopAll: (ranges: Array<[number, number]>) => void
  mergeOverlaps: () => void
  searchPoint: (point: number) => Interval<T>[]
  searchOverlap: (start: number, end: number) => Interval<T>[]
  searchEnveloped: (start: number, end: number) => Interval<T>[]
  searchByLengthStartingAt: (minLength: number, startingAt: number) => Interval<T>[]
  /**
   * The first canonical length-query result whose stored interval passes filterFn.
   * The predicate receives original bounds; the result is clipped to startingAt.
   */
  findOneByLengthStartingAt: (
    minLength: number,
    startingAt: number,
    filterFn?: (iv: Interval<T>) => boolean,
  ) => Interval<T> | undefined
  contains: (point: number) => boolean
  overlaps: (start: number, end: number) => boolean
  clone: () => IntervalCollection<T>
  equals: (other: IntervalCollection<T>) => boolean
  hash: () => string
  toArray: () => Interval<T>[]
  toSorted: () => Interval<T>[]
  toTuples: () => IntervalTuple<T>[]
  toJSON: () => Array<[number, number, T | undefined]>
  toString: () => string
  forEach: (callback: (interval: Interval<T>, index: number) => void) => void
  [Symbol.iterator]: () => Iterator<Interval<T>>
}
