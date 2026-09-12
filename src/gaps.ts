import type { IntervalTree } from './IntervalTree'
import { assert } from './assert'
import { Interval } from './Interval'

/**
 * @experimental Design spike (plan 012). Not exported from the package.
 *
 * Returns the gaps (uncovered sub-ranges) inside `[start, end)` that are not
 * covered by any interval in `tree`. Equivalent to, but cheaper than,
 * `IntervalTree.fromTuples([[start, end]]).difference(tree)`: this is a
 * single `searchOverlap` plus a linear sweep instead of a full tree sweep
 * that allocates and rebalances a result tree.
 *
 * Semantics (see docs/design/gaps.md for rationale):
 * - Half-open range `[start, end)`, matching the rest of the library.
 * - Intervals overlapping the range are clipped to it.
 * - An empty tree yields a single gap `[start, end)`.
 * - A tree fully covering `[start, end)` yields `[]`.
 * - `start >= end` throws, matching `chop`.
 */
export function gaps<T>(tree: IntervalTree<T>, start: number, end: number): Interval<T>[] {
  assert(start < end, 'start must be < end')

  const overlapping = tree.searchOverlap(start, end)
  // searchOverlap does not guarantee order; sort by start for the sweep.
  overlapping.sort((a, b) => a.start - b.start)

  const result: Interval<T>[] = []
  let cursor = start

  for (const iv of overlapping) {
    if (iv.start > cursor) {
      result.push(new Interval(cursor, iv.start))
    }
    if (iv.end > cursor) {
      cursor = iv.end
    }
  }

  if (cursor < end) {
    result.push(new Interval(cursor, end))
  }

  return result
}
