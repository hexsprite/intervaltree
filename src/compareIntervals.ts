import type { Interval } from './Interval'

export function compareIntervals<T = unknown>(a: Interval<T>, b: Interval<T>) {
  return a.start - b.start || a.end - b.end
}
