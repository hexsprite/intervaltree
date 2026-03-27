# Autoresearch: IntervalTree Performance Optimization

## Objective
Optimize the IntervalTree library's core performance: tree construction (build) and point query search. The workload is 10,000 intervals in a 0–1M range with 10,000 point queries, using a fixed seed PRNG for deterministic results.

## Metrics
- **Primary**: `total_ms` (ms, lower is better) — sum of build + search time
- **Secondary**: `build_ms` — tree construction time; `search_ms` — 10K point query time

## How to Run
`./autoresearch.sh` — builds `src/bench-metric.ts` with tsup (production), runs 5 iterations, reports median timings as `METRIC name=value` lines.

## Files in Scope
- `src/IntervalTree.ts` — Main public API, tree construction, search dispatch
- `src/Node.ts` — AVL-balanced tree node: insert, remove, rotate, search, augmented attributes (maxEnd, maxLength, minStart)
- `src/Interval.ts` — Immutable interval value object (start, end, data)
- `src/compareIntervals.ts` — Comparison function for sorting intervals
- `src/bench-metric.ts` — Benchmark harness (deterministic PRNG, timing output)

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
- NODE_ENV=production disables debug verification, so assert/verify overhead is not in the hot path

## What's Been Tried
- **Baseline**: ~64ms total (build ~42ms, search ~22ms) with vanilla AVL tree + augmented attributes
