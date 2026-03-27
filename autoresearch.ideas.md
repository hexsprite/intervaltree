# Autoresearch Ideas

## Status: COMPLETE — 236x improvement (1,146ms → 4.85ms)

62 experiments across 11+ sessions. 111 unit tests + 200 property-based model checks (16 commands).
At V8 JIT floor (~7μs per schedule hit, ~120ns per node visit).

## Summary of wins (in order of impact)
1. updateAttributes for-loops (5.2x) — eliminated spread+map allocations  
2. mergeOverlaps dirty flag (3.2x) — skip rebuild when unchanged
3. Dirty flag preserved in chop (2.6x) — chop never creates overlaps
4. O(n) balanced bulk build (1.8x) — midpoint split vs sequential inserts
5. fromSortedIntervals (9%) — skip redundant sort
6. In-order traversals with per-child pruning — eliminate sorts in searches
7. findFirstByLengthStartingAt — early termination for first match
8. Micro-opts: for-loops, direct field access, inline computations

## New APIs added for Focuster
- `first()` / `last()` — O(log n) min/max access
- `findFirstByLengthStartingAt()` — O(log n) with early termination  
- `size` — O(1) counter

## Confirmed dead ends (20+ attempts)
See autoresearch.md for exhaustive list.

## Only theoretical paths remaining
- Flat array-based tree (complete rewrite)
- WASM/Rust (FFI overhead negates gains at <5ms scale)
