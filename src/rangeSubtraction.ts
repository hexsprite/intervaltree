import { Interval } from './Interval'

/** Anything with `start` and `end`, such as an `Interval`. */
export interface RangeLike {
  readonly start: number
  readonly end: number
}

/**
 * Subtracts `ranges` from `intervals` and returns the surviving fragments.
 *
 * `intervals` must be sorted by start. Overlapping intervals are fine.
 * `ranges` can be in any order and can overlap or touch. The function copies
 * them before it merges, so the caller's arrays and tuples stay unchanged.
 * Each fragment keeps the `data` of the interval it came from.
 *
 * Not used by `ArrayIntervalCollection`. That class is the model-check
 * oracle and must stay independent of this sweep.
 */
export function subtractRanges<T>(
  intervals: readonly Interval<T>[],
  ranges: Iterable<RangeLike>,
): Interval<T>[] {
  const sorted: Array<[number, number]> = []
  for (const r of ranges)
    sorted.push([r.start, r.end])
  if (sorted.length === 0)
    return intervals.slice()
  sorted.sort((a, b) => a[0] - b[0])

  // Merge overlapping or touching ranges. Every tuple here is our own copy.
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

  // Linear sweep. Interval starts never decrease, so `chopIdx` only moves forward.
  const result: Interval<T>[] = []
  let chopIdx = 0

  for (const iv of intervals) {
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

  return result
}
