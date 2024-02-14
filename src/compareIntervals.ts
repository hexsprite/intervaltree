import type { Interval } from './Interval'

export function compareIntervals(a: Interval, b: Interval) {
  return a.start - b.start || a.end - b.end
}
