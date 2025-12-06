# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

#### 🎯 TypeScript Generics Support
- **Full generic type support** across `Interval<T>`, `IntervalTree<T>`, and `Node<T>` classes
- Type-safe interval data with automatic type inference
- Generic support in `fromTuples<T>()` static factory method
- All method signatures now preserve type information through the API

**Migration Example:**
```typescript
// Before - data was untyped
const tree = new IntervalTree()
tree.addInterval(1, 5, { id: 123 })
const data = tree.searchPoint(3)[0].data // type: unknown

// After - full type safety
interface Task { id: number; name: string }
const tree = new IntervalTree<Task>()
tree.addInterval(1, 5, { id: 123, name: 'Task 1' })
const data = tree.searchPoint(3)[0].data // type: Task | undefined
```

#### 🔄 Iterator Protocol Implementation
- `Symbol.iterator` implementation for native `for...of` loop support
- Works with spread operator: `[...tree]`
- Compatible with `Array.from(tree)`
- `forEach(callback)` method for functional iteration
- `map(callback)` method for transforming intervals with type flexibility

**New API:**
```typescript
const tree = IntervalTree.fromTuples([[1, 5], [10, 15]])

// Iterate with for...of
for (const interval of tree) {
  console.log(interval.start)
}

// Spread operator
const intervals = [...tree]

// forEach
tree.forEach((interval, index) => { /* ... */ })

// map - transform intervals
const shifted = tree.map(iv =>
  new Interval(iv.start + 10, iv.end + 10, iv.data)
)
```

#### ✅ Boolean Membership Check Methods
- `contains(point: number): boolean` - Quick point containment checks
- `overlaps(start: number, end: number): boolean` - Range overlap detection
- `isEmpty: boolean` - Getter property for empty tree checks

**New API:**
```typescript
const tree = IntervalTree.fromTuples([[9, 17], [18, 20]])

// Before - verbose
if (tree.searchPoint(12).length > 0) { /* ... */ }

// After - clean and expressive
if (tree.contains(12)) { /* ... */ }
if (tree.overlaps(5, 10)) { /* ... */ }
if (tree.isEmpty) { /* ... */ }
```

#### 🔀 Set-Like Operations
- `union(other: IntervalTree<T>): IntervalTree<T>` - Combine intervals from multiple trees
- `intersection(other: IntervalTree<T>): IntervalTree<T>` - Find overlapping regions
- `difference(other: IntervalTree<T>): IntervalTree<T>` - Remove overlapping intervals

**New API:**
```typescript
const schedule1 = IntervalTree.fromTuples([[9, 12], [14, 17]])
const schedule2 = IntervalTree.fromTuples([[10, 11], [18, 20]])

// Combine all intervals
const all = schedule1.union(schedule2)

// Find overlapping regions
const conflicts = schedule1.intersection(schedule2)

// Remove overlapping intervals
const available = fullDay.difference(meetings)
```

### Changed

- **BREAKING (TypeScript only)**: `IntervalTree`, `Interval`, and `Node` are now generic classes
  - **Impact**: Minimal - defaults to `unknown` for backward compatibility
  - **Action**: Add type parameters where you want type safety: `new IntervalTree<MyType>()`

- **BREAKING (TypeScript only)**: `data` property now typed as `T | undefined` instead of `unknown`
  - **Impact**: May require optional chaining or type guards
  - **Action**: Use optional chaining: `interval.data?.property`

- `fromTuples()` now accepts typed tuples: `Array<[number, number] | [number, number, T]>`
  - Fully backward compatible - works without type parameter

- `Interval.toTuple()` return type updated to `IntervalTuple<T>`
  - Includes data in tuple only if defined (backward compatible)

### Documentation

- Added comprehensive TypeScript Generics section to README
- Added Iterator Support section with examples
- Added Boolean Checks section
- Added Functional Operations section (forEach, map)
- Added Set Operations section (union, intersection, difference)
- Added Real-World Examples section with:
  - Scheduling System example
  - Time Range Management example
  - Resource Allocation example
- Added **Interval Semantics** section documenting half-open `[start, end)` intervals
- Updated API Reference with all new methods organized by category
- Added 18 new comprehensive tests (49 total tests now)

### Internal

- Updated all internal classes to use generic type parameters
- Updated `compareIntervals` to accept generic intervals
- Updated `IntervalCollection` interface with generic types
- All internal method signatures now properly typed with generics

## Migration Guide

### From v1.0.0 to v1.1.0

#### JavaScript Users
✅ **No changes required** - All improvements are fully backward compatible for JavaScript users.

#### TypeScript Users

**Minimal Breaking Changes:**

1. **If you extended `Interval`, `IntervalTree`, or `Node` classes:**
   ```typescript
   // Before
   class MyTree extends IntervalTree { /* ... */ }

   // After - add generic parameter
   class MyTree<T = unknown> extends IntervalTree<T> { /* ... */ }
   ```

2. **If you used strict typing for `data` property:**
   ```typescript
   // Before
   const data: MyType = tree.searchPoint(5)[0].data as MyType

   // After - type-safe without casting
   const tree = new IntervalTree<MyType>()
   const data = tree.searchPoint(5)[0].data // Type: MyType | undefined
   ```

**Recommended Upgrades (Non-Breaking):**

1. **Add type parameters for type safety:**
   ```typescript
   // Basic upgrade
   const tree = new IntervalTree<string>()

   // Or with complex types
   interface Task { id: number; name: string }
   const tree = new IntervalTree<Task>()
   ```

2. **Use new boolean methods:**
   ```typescript
   // Replace length checks
   if (tree.searchPoint(5).length > 0) { /* ... */ }
   // With
   if (tree.contains(5)) { /* ... */ }
   ```

3. **Use iterator protocol:**
   ```typescript
   // Replace toArray()
   tree.toArray().forEach(interval => { /* ... */ })
   // With
   for (const interval of tree) { /* ... */ }
   ```

4. **Use set operations for tree composition:**
   ```typescript
   // Combine trees
   const combined = tree1.union(tree2)

   // Find conflicts
   const conflicts = tree1.intersection(tree2)

   // Find available slots
   const available = fullRange.difference(booked)
   ```

## Feature Comparison

| Feature | Before v1.1.0 | v1.1.0+ |
|---------|---------------|---------|
| TypeScript Generics | ❌ `data: unknown` | ✅ `data: T \| undefined` |
| For...of loops | ❌ Use `.toArray()` | ✅ `for (const iv of tree)` |
| Boolean checks | ❌ `.searchPoint(x).length > 0` | ✅ `.contains(x)` |
| Set operations | ❌ Manual implementation | ✅ `.union()`, `.intersection()`, `.difference()` |
| Functional methods | ❌ Use `.toArray().map()` | ✅ `.forEach()`, `.map()` |
| Empty check | ❌ `tree.size === 0` | ✅ `tree.isEmpty` |

## Upgrading

```bash
npm install intervaltree@latest
```

Then optionally update your code to use the new features:

```typescript
// 1. Add type parameters (recommended)
const tree = new IntervalTree<YourType>()

// 2. Use iterator protocol (cleaner code)
for (const interval of tree) {
  console.log(interval)
}

// 3. Use boolean helpers (more expressive)
if (tree.contains(point)) { /* ... */ }
if (tree.overlaps(start, end)) { /* ... */ }

// 4. Use set operations (powerful composition)
const combined = tree1.union(tree2)
const conflicts = tree1.intersection(tree2)
const available = fullRange.difference(occupied)
```

## Acknowledgments

These improvements were inspired by research into interval tree libraries across multiple ecosystems:
- Python's `intervaltree` library (set operations, iterator protocol)
- `@flatten-js/interval-tree` (TypeScript generics, functional methods)
- `node-interval-tree` (iterator support)
- Rust's `unbounded-interval-tree` (flexible interval types)

## Links

- [Full Documentation](README.md)
- [API Reference](README.md#api-reference)
- [Examples](README.md#examples)
- [GitHub Repository](https://github.com/hexsprite/intervaltree)

---

**Note**: This library maintains its use of half-open intervals `[start, end)` where `start` is inclusive and `end` is exclusive. This follows the recommendation from Edsger W. Dijkstra's 1982 note on interval notation and is used by most programming languages and CS literature.
