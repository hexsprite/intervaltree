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

4. **Invalid range.** Decided: `start >= end` throws `start must be < end`,
   matching `chop`'s existing assertion, for consistency across the API.

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
function gaps<T>(tree: IntervalTree<T>, start: number, end: number): Interval<T>[]
```

Free function (not a tree method) is deliberate for the spike, mirroring
`fromTuples`-style ergonomics without adding tree-internal coupling; whether
it should instead be `IntervalTree.prototype.gaps(start, end)` for API
symmetry with `difference`/`chop`/etc. is an open question for the
maintainer, not decided here.

## Follow-up (out of scope for this spike)

If accepted, `searchByLengthStartingAt`'s "first free slot of length L"
logic can likely be re-expressed as a filter over `gaps`, per the plan's
maintenance note. Not attempted here.
