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
(Baseline pending — first run)
