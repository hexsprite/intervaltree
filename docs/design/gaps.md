# Design note: `gaps(tree, start, end)` (plan 012 spike)

Status: prototype only. Not exported from `src/index.ts`, not documented in
README. This note records the design decisions and bench results for the
maintainer to accept or reject before it becomes public API.

## Problem

The README teaches "free time" as:

```ts
const fullDay = IntervalTree.fromTuples([[0, 24]])
const meetings = IntervalTree.fromTuples([[9, 10], [14, 15]])
const freeTime = fullDay.difference(meetings)
```

This builds a synthetic full-range tree, then runs `difference`'s general
O(N+M) sweep to produce a whole new tree, just to read off the gaps. A direct
`gaps(tree, start, end)` does the same job with one `searchOverlap` call and a
linear sweep over the result, no synthetic tree and no tree construction on
the way out.

## Semantic decisions

1. **Input domain: raw or merged intervals?** Decided: works correctly on
   raw (unmerged, possibly overlapping) intervals too, not just merged ones.
   The sweep treats any overlap as coverage, so callers don't have to call
   `mergeOverlaps()` first. Example: `gaps([[0,5],[3,8],[20,25]], 0, 30)` →
   `[[8,20],[25,30]]`. This is a stronger guarantee than the plan's
   recommendation (merged-only) at no extra cost, since `searchOverlap`
   already returns whatever is in the tree.

2. **Return type: `Interval<T>[]` or tuples?** Decided: `Interval<T>[]`
   (matching the plan's recommendation and `searchByLengthStartingAt`'s
   style), with `data` left `undefined` since a gap has no source interval.

3. **Boundary cases.** Decided as specified: empty tree over `[s, e)` →
   `[[s, e)]`. Tree fully covering `[s, e)` → `[]`. Intervals extending past
   the range are clipped to it (verified: `[[-5,3],[8,30]]` over `[0,10)` →
   `[[3,8)]`).

4. **Invalid window.** The spike requires `start < end`. This differs from
   `chop` and `chopAll`, where empty windows are no-ops. Keep this experimental
   boundary until a public gaps API is proposed.

5. **`minLength` filter parameter?** Decided: no. Callers already have
   `Array.prototype.filter` on the result, and folding length filtering into
   `gaps` would duplicate `searchByLengthStartingAt`'s job for no benefit.

## Correctness

`src/gaps.spec.ts` has direct unit tests for all five decisions plus the
README example, and a fast-check property test (300 runs) asserting
`gaps(tree, start, end)` equals
`IntervalTree.fromTuples([[start, end]]).difference(tree).toTuples()`
restricted to `[start, end)`, across random trees (up to 30 random intervals)
and random ranges. No disagreement found — no STOP condition triggered.

## Benchmark

`bench/gaps.bench.ts`, 10k merged intervals (span 8, gap 2, total range
100,000), `gaps` vs `IntervalTree.fromTuples([[start,end]]).difference(tree)`:

| Window | `gaps` faster by |
|---|---|
| 1% of range (`[0, 1000)`) | **52.4x** |
| 100% of range (`[0, 100000)`) | **1.28x** |

The 1% case is the common scheduling query ("free slots this afternoon") and
is where avoiding the synthetic tree pays off most: `difference`'s own cost
is dominated by building and sorting `fullRange`'s single interval and the
tree-rebalancing on the output, none of which `gaps` needs. At 100% the gap
narrows because `difference` already has a sweep-line fast path (see
`src/IntervalTree.ts`'s `difference`), but `gaps` still wins by skipping
result-tree construction entirely — it returns a plain array.

## Proposed public signature

```ts
function gaps<T>(tree: IntervalCollection<T>, start: number, end: number): Interval<T>[]
```

Decision (2026-10-04): keep gaps as a free function over `IntervalCollection`.
The library is generic; busy and free interpretations belong to callers, not
storage types. This helper remains experimental and unexported. See
`GLOSSARY.md` for the terminology.

## Length-query duality

For stored busy intervals B and a window W, gaps finds uncovered bounds.
Length queries instead search stored bounds. They agree only after taking the
complement: construct F as W.difference(B), merge F, then compare
`gaps(B, Math.max(t, W.start), W.end).filter(iv => iv.length >= L)` with
`F.searchByLengthStartingAt(L, t)`. This requires t < W.end.

Neither operation replaces the other on the same collection. Length queries
do not join touching stored intervals; callers should merge them first when
that is their intended interpretation. Focuster stores free slots and chops
bookings out, so its existing length queries are appropriate. A scheduling
wrapper or first-gap convenience API can wait for a concrete second caller.
