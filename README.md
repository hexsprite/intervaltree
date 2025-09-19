# intervaltree JS

A mutable, self-balancing interval tree for JavaScript/TypeScript.

Written in TypeScript with no external dependencies. Uses a red-black tree under the hood for O(log n) operations.

## Install

```bash
npm install intervaltree
```

## Quick Start

```js
import { Interval, IntervalTree } from 'intervaltree'

const tree = new IntervalTree()
tree.addInterval(1, 5, 'data for 1-5')
tree.addInterval(3, 7)
tree.addInterval(8, 10)

// Query by point
const intervals = tree.searchPoint(4)  // Returns intervals containing point 4
// Result: [Interval(1, 5, 'data for 1-5'), Interval(3, 7)]

// Query by range (overlaps)
const overlapping = tree.searchOverlap(6, 9)  // Returns intervals overlapping [6, 9)
// Result: [Interval(3, 7), Interval(8, 10)]
```

## Examples

### Creating a Tree

```js
import { Interval, IntervalTree } from 'intervaltree'

// Empty tree
const tree = new IntervalTree()

// From array of Interval objects
const intervals = [
  new Interval(1, 3, 'first'),
  new Interval(5, 8, 'second'),
  new Interval(7, 10, 'third')
]
const tree2 = new IntervalTree(intervals)

// From tuples
const tree3 = IntervalTree.fromTuples([
  [1, 3],
  [5, 8],
  [7, 10, 'with data']
])
```

### Adding Intervals

```js
// Add with explicit Interval object
tree.add(new Interval(1, 5, 'my data'))

// Add with convenience method
tree.addInterval(10, 15, 'more data')

// Add multiple intervals at once
tree.addAll([
  new Interval(20, 25),
  new Interval(30, 35, 'bulk add')
])

// Note: Duplicate intervals (same start, end, and data) are ignored
tree.addInterval(1, 5)
tree.addInterval(1, 5)  // This is a no-op
console.log(tree.size)  // 1
```

### Querying the Tree

```js
// Find all intervals containing a point
const pointResult = tree.searchPoint(6)
// Returns: Array of Interval objects containing point 6

// Find all intervals overlapping a range
const overlapResult = tree.searchOverlap(5, 10)
// Returns: All intervals that overlap with [5, 10)

// Find intervals completely enveloped by a range
const enveloped = tree.searchEnvelop(0, 100)
// Returns: All intervals where start >= 0 and end <= 100

// Find intervals by minimum length starting at/after a point
const byLength = tree.searchByLengthStartingAt(3, 5)
// Returns: All intervals of length >= 3 starting at position 5 or later

// Find first interval of minimum length
const first = tree.findOneByLengthStartingAt(3, 5)
// Returns: First interval of length >= 3 starting at/after position 5
// If found interval starts before 5, it's adjusted to start at 5
```

### Accessing Interval Properties

```js
const interval = new Interval(4, 7, { id: 123, name: 'test' })

console.log(interval.start)   // 4
console.log(interval.end)     // 7
console.log(interval.data)    // { id: 123, name: 'test' }
console.log(interval.length)  // 3

// Check if interval contains a point
interval.containsPoint(5)  // true
interval.containsPoint(7)  // false (end is exclusive)

// Check if interval overlaps with a range
interval.overlapsWith(3, 6)  // true
```

### Removing Intervals

```js
// Remove a specific interval
const toRemove = new Interval(1, 5, 'my data')
tree.remove(toRemove)

// Remove multiple intervals
tree.removeAll([interval1, interval2])

// Remove all intervals overlapping a range
tree.removeEnveloped(5, 10)
// Removes only intervals completely contained within [5, 10)
```

### Chopping (Advanced)

The `chop` method removes a section from all intervals in the tree, splitting intervals that partially overlap the chopped region.

```js
const tree = new IntervalTree()
tree.addInterval(0, 10)
tree.addInterval(5, 15)
tree.addInterval(12, 20)

// Remove the region [7, 13) from all intervals
tree.chop(7, 13)

console.log(tree.toTuples())
// Result: [[0, 7], [13, 15], [13, 20]]
// The interval [0, 10] becomes [0, 7]
// The interval [5, 15] becomes [13, 15]
// The interval [12, 20] becomes [13, 20]
```

### Merging Overlapping Intervals

```js
const tree = IntervalTree.fromTuples([
  [1, 5],
  [4, 8],   // Overlaps with [1, 5]
  [10, 12],
  [11, 15]  // Overlaps with [10, 12]
])

tree.mergeOverlaps()

console.log(tree.toTuples())
// Result: [[1, 8], [10, 15]]
```

### Utility Methods

```js
// Get all intervals as array
const allIntervals = tree.toArray()

// Get sorted array of intervals
const sorted = tree.toSorted()  // Sorted by start, then end

// Get as array of tuples
const tuples = tree.toTuples()  // [[start, end], [start, end, data], ...]

// Get tree size
console.log(tree.size)  // Number of intervals in tree

// Clone the tree
const cloned = tree.clone()

// Get string representation
console.log(tree.toString())
// Output: "IntervalTree([ Interval(1, 5, length=4), Interval(10, 15, length=5) ])"

// Verify tree structure (for debugging, only in development mode)
tree.verify()
```

### Working with Dates

Since intervals work with numbers, you can use timestamps for date-based intervals:

```js
const schedule = new IntervalTree()

// Add time slots (using timestamps)
const start = new Date('2024-01-01T09:00:00').getTime()
const end = new Date('2024-01-01T10:00:00').getTime()
schedule.addInterval(start, end, 'Morning meeting')

// Query for a specific time
const when = new Date('2024-01-01T09:30:00').getTime()
const conflicts = schedule.searchPoint(when)

// Find available slots
const dayStart = new Date('2024-01-01T08:00:00').getTime()
const minDuration = 60 * 60 * 1000  // 1 hour in milliseconds
const available = schedule.findOneByLengthStartingAt(minDuration, dayStart)
```

## API Reference

### IntervalTree

- `constructor(intervals?: Interval[])` - Create a new tree, optionally with initial intervals
- `static fromTuples(tuples: Array<[number, number] | [number, number, unknown]>)` - Create from tuple array
- `add(interval: Interval)` - Add an interval to the tree
- `addInterval(start: number, end: number, data?: unknown)` - Convenience method to add interval
- `addAll(intervals: Interval[])` - Add multiple intervals
- `remove(interval: Interval)` - Remove a specific interval
- `removeAll(intervals: Interval[])` - Remove multiple intervals
- `removeEnveloped(start: number, end: number)` - Remove intervals contained within range
- `searchPoint(point: number)` - Find all intervals containing a point
- `searchOverlap(start: number, end: number)` - Find all intervals overlapping a range
- `searchEnvelop(start: number, end: number)` - Find intervals completely within a range
- `searchByLengthStartingAt(length: number, start: number)` - Find intervals by minimum length
- `findOneByLengthStartingAt(minLength: number, startingAt: number, filterFn?: (iv: Interval) => boolean)` - Find first matching interval
- `chop(start: number, end: number)` - Remove a region from all intervals
- `mergeOverlaps()` - Merge all overlapping intervals
- `clone()` - Create a deep copy of the tree
- `toArray()` - Get all intervals as an array
- `toSorted()` - Get all intervals sorted by start then end
- `toTuples()` - Get intervals as tuple array
- `size` - Get the number of intervals in the tree

### Interval

- `constructor(start: number, end: number, data?: unknown)` - Create an interval
- `start` - Get the start point (inclusive)
- `end` - Get the end point (exclusive)
- `data` - Get the associated data
- `length` - Get the interval length (end - start)
- `containsPoint(point: number)` - Check if interval contains a point
- `overlapsWith(start: number, end: number)` - Check if interval overlaps with range
- `equals(other: Interval)` - Check equality with another interval
- `static compare(a: Interval, b: Interval)` - Comparator function for sorting
