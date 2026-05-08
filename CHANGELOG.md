# Changelog

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
