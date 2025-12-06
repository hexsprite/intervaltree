import type { Interval } from './Interval'

export interface IntervalCollection<T = unknown> {
  size: number
  addInterval: (start: number, end: number, data?: T) => void
  clone: () => IntervalCollection<T>
  chop: (start: number, end: number) => void
  searchPoint: (point: number) => Interval<T>[]
  hash: () => string
  mergeOverlaps: () => void
  addAll: (intervals: Interval<T>[]) => void
  findOneByLengthStartingAt: (
    minLength: number,
    startingAt: number,
    filterFn?: (iv: Interval<T>) => boolean,
  ) => Interval<T> | undefined
  toArray: () => Interval<T>[]
  toSorted: () => Interval<T>[]
  remove: (interval: Interval<T>) => void
}
