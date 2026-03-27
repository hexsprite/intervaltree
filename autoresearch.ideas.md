# Autoresearch Ideas

## Status: 253x improvement (1,146ms → 4.52ms), 55 experiments

Practical optimization limit reached. Schedule loop runs at ~7μs per hit on ~250 nodes. 
Init phase at ~2.2ms for chopAll of 1000+101 ranges. Both are near V8's JIT floor.

## All confirmed dead ends (don't retry)
- Removing/guarding assert in Interval constructor
- Replacing #private with readonly public on Interval (confirmed 2x)
- Insertion sort vs V8 Timsort
- Fast-path/single-overlap chop
- Eliminating intermediate arrays in chop (confirmed 2x)
- Rotation method optimization (too infrequent)
- _buildBalanced dedup optimization
- chopKnownInterval / findFirstRaw (within noise)
- In-place replaceInterval/replaceValue (correctness issues, tried 4x)
- Shared scratch arrays for remove (confirmed 2x at different scales)
- Swap-pop vs splice in remove
- Inline constructor attributes
- Derive maxLength from maxEnd
- searchOverlap early termination
- Sort chopAll ranges in-place (API-breaking mutation)
- Skip updateAttributes in Node constructor (V8 deopt)
- Avoid deep clone in remove successor (successor is usually leaf, clone is cheap)

## Only theoretical paths remaining
- **Flat array-based tree**: Cache-friendly layout. Complete rewrite.
- **WASM/Rust**: FFI overhead negates gains at this scale.
