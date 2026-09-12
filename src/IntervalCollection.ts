import type { Interval } from './Interval'
import type { IntervalTuple } from './types'

/**
 * Full public API a mutable interval collection can implement. Widened (see
 * in-30p.16) to every IntervalTree member a generic collection can satisfy,
 * so a second implementation (e.g. a flat typed-array tree) can conform and
 * be swapped in wherever an IntervalCollection is expected.
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
  chop: (start: number, end: number) => void
  chopAll: (ranges: Array<[number, number]>) => void
  mergeOverlaps: () => void
  searchPoint: (point: number) => Interval<T>[]
  searchOverlap: (start: number, end: number) => Interval<T>[]
  searchEnveloped: (start: number, end: number) => Interval<T>[]
  searchByLengthStartingAt: (minLength: number, startingAt: number) => Interval<T>[]
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
