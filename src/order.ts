import { Interval } from './Interval'

/** Canonical order of returned bounds; identical bounds have no data tie-break. */
export function compareIntervals<T = unknown>(a: Interval<T>, b: Interval<T>): number {
  return (a.start === b.start ? 0 : a.start - b.start)
    || (a.end === b.end ? 0 : a.end - b.end)
}

/** The caller must first check that positive length remains after startingAt. */
export function clipStart<T>(interval: Interval<T>, startingAt: number): Interval<T> {
  return interval.start < startingAt
    ? new Interval(startingAt, interval.end, interval.data)
    : interval
}

export function isCanonical(intervals: readonly Interval[]): boolean {
  return intervals.every((iv, i) => i === 0 || compareIntervals(intervals[i - 1], iv) <= 0)
}
