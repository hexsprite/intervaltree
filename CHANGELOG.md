# Changelog

## [2.1.0](https://github.com/hexsprite/intervaltree/compare/v2.0.0...v2.1.0) (2026-10-04)


### Features

* add IntervalTree.fromJSON for exact serialize round trips ([bfe9bbe](https://github.com/hexsprite/intervaltree/commit/bfe9bbe1e439785fdb9eb4bcc61427a2709d6764))
* export ArrayIntervalCollection as reference implementation ([c4ccdf6](https://github.com/hexsprite/intervaltree/commit/c4ccdf6b9526608dbc3cfd4e3e2e93a094da26f1))
* widen IntervalCollection to the full API ([54cf430](https://github.com/hexsprite/intervaltree/commit/54cf43029ada01661d09296473f3960ad9e23f5b))


### Bug Fixes

* add exports map so require() resolves the cjs build ([8619f02](https://github.com/hexsprite/intervaltree/commit/8619f0205c6ffb30b2f37f26441e87143ed077f7))
* align ArrayIntervalCollection hash and constructor with IntervalTree ([d72a67b](https://github.com/hexsprite/intervaltree/commit/d72a67b5aff1c9ae422deb8e4b4ab5627a2d8812))
* correct chop assertion message ([05a2fd3](https://github.com/hexsprite/intervaltree/commit/05a2fd39c135004ac565382aec28547eea4a1012))
* default invariant checks off and read flag at runtime ([ccef5d9](https://github.com/hexsprite/intervaltree/commit/ccef5d9a285bd39e61a6f4bb78b3e139119d8b84))
* guard searchByLengthStartingAt against non-positive minLength ([e7e6639](https://github.com/hexsprite/intervaltree/commit/e7e6639a662fb9ef62fb6f9f30aa2bf94393fde7))
* keep same-start intervals sorted by end so equals/first/last are order-independent ([29d5cad](https://github.com/hexsprite/intervaltree/commit/29d5cadd727cca74d4f7a7b8c540446a0ac0886c))
* make empty chop ranges a no-op and validate chopAll ranges up front ([a81addd](https://github.com/hexsprite/intervaltree/commit/a81addd98932a4c4b9cae2aea8171d16341f84a1))
* make verify() read-only and check every invariant ([fe229e1](https://github.com/hexsprite/intervaltree/commit/fe229e12a8f675619970472efe42b92d7c9430de))
* require a gap between intervals in a clean tree ([53ab6ce](https://github.com/hexsprite/intervaltree/commit/53ab6ce03540b2c0b910b93e266e417941f1726e))
* return the largest-end interval from last() and document canonical order ([b7ae950](https://github.com/hexsprite/intervaltree/commit/b7ae950134d73a46852d3c9d90b1656e41eb5b76))
* sort searchByLengthStartingAt results after clipping to startingAt ([686140c](https://github.com/hexsprite/intervaltree/commit/686140c7063d555c913fe69c00d60800fee59bab))
* stop chopAll from mutating the caller's ranges ([5875f5d](https://github.com/hexsprite/intervaltree/commit/5875f5d11c828ea7cdaf99a54f7baf0ae09cbee5))
* verify strict ordering of left child ([a927b23](https://github.com/hexsprite/intervaltree/commit/a927b234d012dea0e75d78474daa75c1c268b849))


### Performance Improvements

* copy augmentation fields in Node.clone instead of recomputing ([6a06086](https://github.com/hexsprite/intervaltree/commit/6a06086f4954db7926556d5ae305f7d3078b3517))
* early-exit contains() and overlaps() ([802dd09](https://github.com/hexsprite/intervaltree/commit/802dd09a91a024affb181e8e17bb757e6052f07b))
* faster add, remove, chop, chopAll, and removeEnveloped (5–12% in the bundled benchmarks): the tree core now tracks its own size and reports insert/remove results without module-level state ([03c9d74](https://github.com/hexsprite/intervaltree/commit/03c9d74))

## [2.0.0](https://github.com/hexsprite/intervaltree/compare/v1.4.1...v2.0.0) (2026-05-13)


### ⚠ BREAKING CHANGES

* require Node 20 runtime

### Features

* require Node 20 runtime ([95932f2](https://github.com/hexsprite/intervaltree/commit/95932f223f56fb77a69ea996d5938acee994ad1d))


### Bug Fixes

* bundle noble hashes in dist ([f8f4305](https://github.com/hexsprite/intervaltree/commit/f8f4305ce1fab8befa3e317e9f72565fefc611bf))
* ignore local agent metadata in lint ([9a5fb54](https://github.com/hexsprite/intervaltree/commit/9a5fb54b5eaacab033026753157caec6a54f19e1))
* use noble sha256 implementation ([472334e](https://github.com/hexsprite/intervaltree/commit/472334e3a86cc60f3f90cd91c63965a16ee8aebf))

## [1.5.0] (2026-05-08)

### Features

* add `rangeUnion(other)` for mathematical range union that merges overlapping or adjacent ranges

### Bug Fixes

* duplicate detection now matches the documented contract: only intervals with the same start, end, and data are deduplicated
* remove Node-specific runtime imports from package source by replacing `node:assert` and `node:crypto` usage with package-local helpers
* correct README architecture docs from red-black tree to augmented AVL tree

## [1.4.1](https://github.com/hexsprite/intervaltree/compare/v1.4.0...v1.4.1) (2026-04-27)


### Bug Fixes

* **node:** clone() must preserve height for AVL balance ([e582ebc](https://github.com/hexsprite/intervaltree/commit/e582ebcc97deb67e4099ed40e5b6451523a593bb))


### Performance Improvements

* **difference:** O(N+M) sweep-line replaces N×chop loop ([81a4b7d](https://github.com/hexsprite/intervaltree/commit/81a4b7dba61518ce2ead64bc8bc77bfc1301b098))
* **removeEnveloped:** single-pass walk with subtree pruning ([4e36c89](https://github.com/hexsprite/intervaltree/commit/4e36c89b1d521b143fc8f3d62c7b4f57cdef8b02))

## [1.4.0] (2026-04-17)

### Features

* add `equals(other)` for semantic tree equality (sorted intervals + data), insensitive to internal topology
* add `toJSON()` returning canonical `[start, end, data][]` form — `JSON.stringify(tree)` now returns sorted intervals instead of the raw object graph

### Bug Fixes

* `hash()` is now semantic: same intervals ⇒ same hash, regardless of op sequence or construction order. Previously digested `JSON.stringify(this)` which included internal tree topology, so a tree built via `fromTuples` and a tree built via `addInterval`s of the same intervals could produce different hashes — surfacing as false-positive drift in callers using `hash()` for cross-tree equality

## [1.3.0](https://github.com/hexsprite/intervaltree/compare/v1.2.0...v1.3.0) (2026-03-29)


### Features

* **performance**: O(1) `size` property via internal counter instead of materializing the full tree ([b2a962d](https://github.com/hexsprite/intervaltree/commit/b2a962d))
* **performance**: skip `mergeOverlaps()` rebuild when tree is clean (no mutations since last merge) ([b2a962d](https://github.com/hexsprite/intervaltree/commit/b2a962d))
* **performance**: `chop()` rewritten to use single `searchOverlap` pass instead of multiple point queries ([b2a962d](https://github.com/hexsprite/intervaltree/commit/b2a962d))
* add `first()` and `last()` — O(log n) access to min/max start intervals ([b2a962d](https://github.com/hexsprite/intervaltree/commit/b2a962d))
* support `NUM_RUNS` env var for model check iteration count ([d1b04f9](https://github.com/hexsprite/intervaltree/commit/d1b04f9))


### Bug Fixes

* data drop in `searchByLengthStartingAt` and `findOneByLengthStartingAt` ([5f2560d](https://github.com/hexsprite/intervaltree/commit/5f2560d))
* `chopAll` `_size` mismatch when dirty tree produces duplicate fragments ([be5ea9c](https://github.com/hexsprite/intervaltree/commit/be5ea9c))
* add explicit return types to all public API methods ([7df9e9b](https://github.com/hexsprite/intervaltree/commit/7df9e9b))


### Refactors

* consolidate `findFirstByLengthStartingAt` into `findOneByLengthStartingAt` ([49718db](https://github.com/hexsprite/intervaltree/commit/49718db))
* remove `toSorted` polyfill — in-order traversal now returns sorted results natively ([4f8b6e2](https://github.com/hexsprite/intervaltree/commit/4f8b6e2))
* comprehensive code quality improvements across codebase ([313dd8d](https://github.com/hexsprite/intervaltree/commit/313dd8d))


## [1.2.0](https://github.com/hexsprite/intervaltree/compare/v1.1.0...v1.2.0) (2026-03-20)


### Features

* add chopAll() for batch interval removal ([407a015](https://github.com/hexsprite/intervaltree/commit/407a015a7a49802eb30f82fed815d23cbaac0fc6))

## [1.1.0](https://github.com/hexsprite/intervaltree/compare/v1.0.0...v1.1.0) (2025-12-06)


### Features

* add toSorted polyfill for Node 14 compatibility ([284956d](https://github.com/hexsprite/intervaltree/commit/284956d631489f42fb58c1d1ec3f8a42ba68fc4a))
* major DX improvements - generics, iterators, boolean checks, and set operations ([#4](https://github.com/hexsprite/intervaltree/issues/4)) ([f6cde8d](https://github.com/hexsprite/intervaltree/commit/f6cde8d36cc4505af14ff9413ce3e32f030a4bdc))


### Bug Fixes

* use consistent undefined check in toString() ([2df7fba](https://github.com/hexsprite/intervaltree/commit/2df7fba074db7e87c37df44b17af15aeb80335ef))
