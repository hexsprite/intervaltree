# Autoresearch Ideas

## Status: 236x improvement (1,146ms → 4.85ms), 61 experiments, COMPLETE

Optimization limit reached. 111 unit tests + 200 property-based model checks (13 commands) all pass.
Schedule loop: ~2.4ms for 1500 iters (341 hits × ~7μs). Init: ~2.5ms. At V8 JIT floor.

## All confirmed dead ends (don't retry — 20+ attempts, all noise/regression)
See autoresearch.md "What's Been Tried" for full list.

## Only theoretical paths remaining (impractical)
- **Flat array-based tree**: Cache-friendly layout. Complete rewrite, uncertain gains.
- **WASM/Rust**: FFI overhead negates gains at this scale (<5ms total).
