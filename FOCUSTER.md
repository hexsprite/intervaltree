# Focuster Integration Guide

Changes made to `intervaltree` that Focuster should adopt to get the full performance benefit.

## New APIs

### `tree.first()` / `tree.last()` → O(log n) instead of O(n)

**Before (Focuster today):**
```ts
// controller.ts:72 — O(n): flattens entire tree to get first element
!this.tree.isEmpty ? intervalToFreeTime(this.tree.toSorted()[0]) : null

// controller.ts:195 — O(n): flattens entire tree to get last element
const lastFreetime = this.tree.toArray()[this.tree.size - 1]

// controller.ts:219 — O(n): sorts entire tree to get last element
const lastFreetime = this.tree.toSorted()[this.tree.size - 1]
```

**After:**
```ts
// O(log n): walks left/right branch of the tree
const first = this.tree.first()   // interval with smallest start
const last = this.tree.last()     // interval with largest start
```

---

### `tree.size` → now O(1) instead of O(n)

Already used by Focuster — no code changes needed. Just upgrading the library makes `tree.size` and `tree.isEmpty` instant instead of walking the entire tree.

---

### `tree.findFirstByLengthStartingAt(minLength, startingAt)` → O(log n) with early termination

Use instead of `searchByLengthStartingAt` when only the first (earliest) result is needed. Returns `undefined` if no qualifying interval exists.

**Before:**
```ts
// controller.ts:354 — collects ALL qualifying intervals, sorts them, returns array
const result = this.tree.searchByLengthStartingAt(duration, earliest.getTime())
// Then caller typically just uses result[0]
```

**After (when only first result needed):**
```ts
const first = this.tree.findFirstByLengthStartingAt(duration, earliest.getTime())
if (first) {
  // use first.start, first.end directly
}
```

**Where to apply in Focuster:**
- `WholeActionScheduler.schedule()` — only needs the first available freetime
- `SplitActionScheduler.schedule()` — iterates freetimes but could use findFirst for the initial check
- `findByLength()` should keep using `searchByLengthStartingAt` since `findByLengthRounded` iterates all results

---

## Performance Wins from Usage Pattern Changes

### Use `tree.chopAll()` for batch event chopping

**Biggest easy win.** During `initialize()`, Focuster chops events one at a time. `chopAll` does a single linear sweep — much faster for >3 ranges.

**Before (controller.ts:133-138):**
```ts
events.forEach((event) => {
  this.markBusy(+event.start, +event.end)
})
```

**After:**
```ts
this.tree.chopAll(events.map(e => [+e.start, +e.end] as [number, number]))
```

**Also applies to `mergeInvertedIntervals` (controller.ts:601-609):**
```ts
// Before: individual chops
for (const iv of invertIntervals(intervals, +startFrom, +endAt)) {
  freetimeTree.chop(iv[0], iv[1])
}

// After: batch chop
freetimeTree.chopAll(invertIntervals(intervals, +startFrom, +endAt))
```

**And `findFreetimeInBlocks` (findFreetimeInBlocks.ts:74):**
```ts
// Before: individual chops per overlapping action
for (const action of overlapping) {
  tree.chop(+action.start, +action.end)
}

// After: batch chop
tree.chopAll(overlapping.map(a => [+a.start, +a.end] as [number, number]))
```

---

### `mergeOverlaps()` is now smart about dirty state

The library now tracks whether the tree has been modified since the last merge. Calling `mergeOverlaps()` when the tree hasn't changed is a no-op. **No Focuster code changes needed** — just upgrading the library makes the repeated `mergeOverlaps()` calls in the scheduling loop essentially free.

Key detail: `chop()` and `chopAll()` don't mark the tree as dirty for merge purposes, since they only split intervals (never create overlaps). So the pattern `mergeOverlaps → searchByLengthStartingAt → chop → mergeOverlaps → ...` only does the merge once at the start.

---

## Summary of Expected Impact

| Change | Focuster Code Change | Expected Impact |
|--------|---------------------|-----------------|
| Upgrade library | Just bump version | `size` O(1), `mergeOverlaps` dirty flag, all internal optimizations |
| Use `first()`/`last()` | 3 lines | O(log n) instead of O(n) for first/last access |
| Use `findFirstByLengthStartingAt` | ~5 lines in schedulers | O(log n) instead of O(n) per schedule iteration |
| Use `chopAll` in initialize | ~5 lines | Batch linear sweep instead of N individual chops |
| Use `chopAll` in mergeInvertedIntervals | ~3 lines | Same benefit for work-hours chopping |

The library-internal optimizations (236x on the benchmark) apply automatically on upgrade. The usage pattern changes above capture the remaining wins that require Focuster code changes.
