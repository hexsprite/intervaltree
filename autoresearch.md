# Autoresearch: IntervalTree Performance Optimization

## Objective
Optimize the IntervalTree library for Focuster's scheduling workload. The scheduler builds a freelist (2 weeks of time), chops out ~100 busy events + non-work-hours, then schedules ~100 actions by repeatedly calling mergeOverlaps + searchByLengthStartingAt + chop. The benchmark models this exact pattern.

## Metrics
- **Primary**: `total_ms` (ms, lower is better) — sum of init + schedule phases
- **Secondary**: `init_ms` — freelist construction (addInterval + chop events + chop work hours); `schedule_ms` — action scheduling loop (mergeOverlaps + searchByLengthStartingAt + chop × 100)

## How to Run
`./autoresearch.sh` — builds `src/bench-metric.ts` with tsup (production), runs 5 iterations, reports median timings as `METRIC name=value` lines.

## Files in Scope
- `src/IntervalTree.ts` — Main public API, tree construction, search dispatch, chop, mergeOverlaps
- `src/Node.ts` — AVL-balanced tree node: insert, remove, rotate, search, augmented attributes (maxEnd, maxLength, minStart)
- `src/Interval.ts` — Immutable interval value object (start, end, data)
- `src/compareIntervals.ts` — Comparison function for sorting intervals
- `src/bench-metric.ts` — Benchmark harness (deterministic PRNG, Focuster workload model)

## Off Limits
- Test files (`*.spec.ts`, `modelCheck.test.ts`) — must not be modified
- `src/IntervalCollection.ts` — interface, no perf impact
- `src/ArrayIntervalCollection.ts` — reference implementation, not optimized
- Public API signatures — must remain compatible

## Constraints
- All tests must pass (`npm test`)
- No new runtime dependencies
- Public API must remain unchanged (method signatures, behavior)
- Intervals are half-open [start, end)
- NODE_ENV=production disables debug verification

## What's Been Tried
- **updateAttributes() spread+map → for-loops**: 1146→222ms (5.2x) — biggest single win. The Math.min/max with spread was allocating arrays on every insert/rotate.
- **toArray() concat chains → single result array**: 222→182ms — pass result array through recursion instead of creating intermediate arrays.
- **Dirty flag for mergeOverlaps()**: 182→58ms (3.2x) — skip rebuild when tree unchanged since last merge. Constructor must set dirty=true.
- **O(n) balanced bulk build**: 58→31ms (1.8x) — recursive midpoint split instead of O(n log n) sequential inserts. Must handle same-start grouping bidirectionally + dedup.
- **Simplified chop()**: 31→30ms — single searchOverlap instead of 2x searchPoint + removeEnveloped.
- **Shared insert() flag arrays**: 30→28ms — module-level scratch [boolean] arrays instead of per-call allocation.
- **For-loops + direct #branch access in search methods**: 28→27ms — converted forEach to for-loops, inline length calc.
- **In-order toArray traversal + skip redundant sorts**: 27→22ms — toArray now does left→self→right, eliminating toSorted() in mergeOverlaps/chopAll.
- **DEAD END**: Removing assert from Interval constructor — no measurable difference.
- **DEAD END**: Replacing #private fields with readonly public — actually slower.
- **BUG FIX**: searchByLengthStartingAt traversal is NOT in-order (due to shouldSkipBranch pruning) — sort is required. Previous 15ms result was incorrect (unsorted results).
- **Current**: 22.37ms (51.3x faster than 1146ms baseline)
