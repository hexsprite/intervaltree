# Autoresearch Ideas

## Exhausted — at V8 JIT floor

After 45 experiments, we've reached 97x faster than baseline (1,146ms → 11.81ms). The last 10+ experiments have all been noise-level or regressions. The schedule loop runs at ~28μs per hit (~120ns per node visit), which is at V8's JIT floor for pointer-chasing tree workloads.

### Confirmed dead ends (don't retry)
- Removing/guarding assert in Interval constructor
- Replacing #private with readonly public on Interval (V8 prefers private+getters)
- Insertion sort vs V8 Timsort
- Fast-path/single-overlap chop
- Eliminating intermediate arrays in chop
- Rotation method optimization (too infrequent)
- _buildBalanced dedup optimization
- chopKnownInterval / findFirstRaw
- In-place replaceInterval (correctness issues)
- Shared scratch arrays for remove
- Swap-pop vs splice in remove
- Inline constructor attributes
- Derive maxLength from maxEnd
- searchOverlap early termination

### Theoretically possible but impractical
- **Flat array-based tree**: Would improve cache locality but requires complete rewrite.
- **WASM/Rust**: FFI overhead would eat gains at this workload size. Only viable for 10K+ intervals.
- **Node pooling**: Minimal GC pressure at this scale.
