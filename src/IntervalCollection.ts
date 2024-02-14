import type { Interval } from './Interval'

export interface IntervalCollection {
  size: number
  addInterval: (start: number, end: number, data?: any) => void
  clone: () => IntervalCollection
  chop: (start: number, end: number) => void
  searchPoint: (point: number) => Interval[]
  hash: () => string
  mergeOverlaps: () => void
  addAll: (intervals: Interval[]) => void
  findOneByLengthStartingAt: (
    minLength: number,
    startingAt: number,
    filterFn?: (iv: Interval) => boolean
  ) => Interval | undefined
  toArray: () => Interval[]
  toSorted: () => Interval[]
  remove: (interval: Interval) => void
}
