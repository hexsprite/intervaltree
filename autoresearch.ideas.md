# Autoresearch Ideas

## New Operations for Focuster

### 1. `chopAll(ranges)` — batch chop (ALREADY EXISTS but could be used more in Focuster)
Focuster calls `chop()` in a loop ~100+ times during `initialize()` (one per busy event) and again during `markWorkHours()`. The library already has `chopAll()` which does a single linear sweep for >3 ranges. **Focuster should use this instead of individual chops.**

### 2. `min()` / `max()` / `first()` / `last()` — O(log n) extremes
Focuster does `tree.toSorted()[0]` to get the earliest interval and `tree.toArray()[tree.size - 1]` to get the latest. Both are O(n) — they flatten the entire tree to get one element. With an AVL/RB tree we can walk left/right to get min/max in O(log n).

### 3. `size` as a maintained count instead of `toArray().length`
`tree.size` currently calls `toArray().length` which is O(n) every time. Should maintain a running count on insert/remove. Focuster calls `.size` and `.isEmpty` frequently.

### 4. `chopAllSorted(sortedRanges)` — skip the sort for pre-sorted input
When Focuster inverts work hours, the non-work intervals are already sorted. A variant that skips the internal sort would save time.

### 5. `difference(other)` as a primitive — currently does N individual chops
`tree.difference(other)` iterates other.toArray() and calls chop() for each. Could be done as a single merge-sweep like chopAll.

## Performance Optimizations

### Node.ts hot paths
- `updateAttributes()` uses `Math.min(...this.values.map())` and `Math.max(...)` with spread — creates arrays + spreads on every call. Should use simple loops.
- `searchPoint()` could be tighter — avoid array allocation for `values` iteration
- `fromIntervals()` does sorted insert one-by-one — could do a balanced bulk build in O(n) instead of O(n log n)
- `toArray()` creates many intermediate arrays via concat — could use a single flat walk
- `insert()` allocates `[boolean]` arrays for rebalancingDone/updateRequired on every call

### IntervalTree.ts hot paths
- `mergeOverlaps()` rebuilds entire tree from scratch — could merge in-place
- `chop()` does searchPoint twice + removeEnveloped + removeAll + addAll — lots of tree ops per chop
- `removeEnveloped()` does searchEnvelop (which does searchOverlap + filter) then removeAll (N individual removes)
- `size` getter does `toArray().length` — O(n) every time, should cache

### Interval.ts
- Uses `assert()` in constructor — even in production mode this is imported. The import itself may have cost.
- Private fields with `#` (true private) may be slower than underscore-prefixed in some engines

### Structural changes
- Consider storing intervals in a flat typed array (Float64Array) instead of object nodes for cache locality
- The AVL tree uses object-based nodes with pointers — a van Emde Boas layout or implicit array could improve cache performance
- `mergeOverlaps()` before every `searchByLengthStartingAt()` is wasteful if tree hasn't changed — add a dirty flag
