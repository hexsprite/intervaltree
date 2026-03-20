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

### Batch Chopping

The `chopAll` method removes multiple ranges in a single operation, much faster than calling `chop()` individually when removing many ranges (e.g., marking calendar events as busy time).

```js
const tree = new IntervalTree()
tree.addInterval(0, 100)

// Remove multiple ranges at once
tree.chopAll([[10, 20], [30, 40], [50, 60]])

console.log(tree.toTuples())
// Result: [[0, 10], [20, 30], [40, 50], [60, 100]]

// Overlapping chop ranges are merged automatically
tree.chopAll([[10, 30], [20, 40]])
// Equivalent to chopping [10, 40]
```

For small numbers of ranges (≤3), `chopAll` delegates to individual `chop()` calls. For larger batches, it sorts and merges the ranges, then does a single linear sweep — O(n log n) instead of O(n × m) for n ranges on m intervals.

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

**Construction:**
- `constructor(intervals?: Interval<T>[])` - Create a new tree, optionally with initial intervals
- `static fromTuples<T>(tuples: Array<[number, number] | [number, number, T]>)` - Create from tuple array

**Adding/Removing:**
- `add(interval: Interval<T>)` - Add an interval to the tree
- `addInterval(start: number, end: number, data?: T)` - Convenience method to add interval
- `addAll(intervals: Interval<T>[])` - Add multiple intervals
- `remove(interval: Interval<T>)` - Remove a specific interval
- `removeAll(intervals: Interval<T>[])` - Remove multiple intervals
- `removeEnveloped(start: number, end: number)` - Remove intervals contained within range

**Searching:**
- `searchPoint(point: number)` - Find all intervals containing a point
- `searchOverlap(start: number, end: number)` - Find all intervals overlapping a range
- `searchEnvelop(start: number, end: number)` - Find intervals completely within a range
- `searchByLengthStartingAt(length: number, start: number)` - Find intervals by minimum length
- `findOneByLengthStartingAt(minLength: number, startingAt: number, filterFn?: (iv: Interval<T>) => boolean)` - Find first matching interval

**Boolean Checks:**
- `contains(point: number): boolean` - Check if any interval contains a point
- `overlaps(start: number, end: number): boolean` - Check if any interval overlaps with range
- `isEmpty: boolean` - Check if the tree is empty (getter)

**Set Operations:**
- `union(other: IntervalTree<T>): IntervalTree<T>` - Combine all intervals from both trees
- `intersection(other: IntervalTree<T>): IntervalTree<T>` - Find overlapping regions between trees
- `difference(other: IntervalTree<T>): IntervalTree<T>` - Remove overlapping intervals from other tree

**Iteration & Transformation:**
- `[Symbol.iterator]()` - Enables for...of loops and spread operator
- `forEach(callback: (interval: Interval<T>, index: number) => void)` - Execute callback for each interval
- `map<U>(callback: (interval: Interval<T>) => Interval<U>): IntervalTree<U>` - Transform intervals

**Manipulation:**
- `chop(start: number, end: number)` - Remove a region from all intervals
- `mergeOverlaps()` - Merge all overlapping intervals

**Utility:**
- `clone(): IntervalTree<T>` - Create a deep copy of the tree
- `toArray(): Interval<T>[]` - Get all intervals as an array
- `toSorted(): Interval<T>[]` - Get all intervals sorted by start then end
- `toTuples(): IntervalTuple<T>[]` - Get intervals as tuple array
- `size: number` - Get the number of intervals in the tree (getter)

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

## TypeScript Generics

The library now supports full TypeScript generics for type-safe interval data:

```typescript
interface Task {
  id: number
  title: string
  priority: 'high' | 'medium' | 'low'
}

const schedule = new IntervalTree<Task>()
schedule.addInterval(9, 17, {
  id: 1,
  title: 'Work on project',
  priority: 'high'
})

// Full type safety - TypeScript knows the data type!
const tasks = schedule.searchPoint(12)
console.log(tasks[0].data?.title)  // Type-safe access
```

Works with `fromTuples` too:

```typescript
const tree = IntervalTree.fromTuples<string>([
  [1, 5, 'Meeting'],
  [10, 15, 'Lunch'],
])
```

## Iterator Support

Use `for...of` loops and other iterable features:

```typescript
const tree = IntervalTree.fromTuples([
  [1, 5],
  [10, 15],
  [20, 25],
])

// Iterate with for...of
for (const interval of tree) {
  console.log(`${interval.start}-${interval.end}`)
}

// Use spread operator
const intervals = [...tree]

// Use Array.from
const array = Array.from(tree)
```

## Boolean Checks

Convenient methods for membership checks:

```typescript
const schedule = IntervalTree.fromTuples([
  [9, 17],   // 9am - 5pm
  [18, 20],  // 6pm - 8pm
])

// Check if a point is in any interval
schedule.contains(12)  // true (noon is during 9-17)
schedule.contains(17)  // false (end is exclusive)
schedule.contains(19)  // true

// Check if range overlaps with any interval
schedule.overlaps(8, 10)   // true
schedule.overlaps(17, 18)  // false

// Check if tree is empty
schedule.isEmpty  // false
```

## Functional Operations

### forEach

Execute a callback for each interval:

```typescript
tree.forEach((interval, index) => {
  console.log(`${index}: ${interval.toString()}`)
})
```

### map

Transform intervals and create a new tree:

```typescript
const tree = IntervalTree.fromTuples<string>([
  [1, 5, 'task1'],
  [10, 15, 'task2'],
])

// Shift all intervals by 10 units
const shifted = tree.map(interval =>
  new Interval(
    interval.start + 10,
    interval.end + 10,
    interval.data
  )
)

// Result: [[11, 15, 'task1'], [20, 25, 'task2']]
```

You can even change the data type:

```typescript
const withStrings = new IntervalTree<string>(...)
const withNumbers = withStrings.map(interval =>
  new Interval<number>(
    interval.start,
    interval.end,
    interval.data?.length ?? 0
  )
)
```

## Set Operations

Combine and compare interval trees with set-like operations:

### union

Combine all intervals from two trees:

```typescript
const schedule1 = IntervalTree.fromTuples([
  [9, 12],
  [14, 17],
])

const schedule2 = IntervalTree.fromTuples([
  [10, 11],
  [18, 20],
])

const combined = schedule1.union(schedule2)
// Contains all intervals from both trees
```

### intersection

Find overlapping regions between two trees:

```typescript
const available = IntervalTree.fromTuples([
  [9, 17],   // 9am-5pm
  [18, 22],  // 6pm-10pm
])

const requested = IntervalTree.fromTuples([
  [10, 12],  // 10am-12pm
  [20, 23],  // 8pm-11pm
])

const conflicts = available.intersection(requested)
// Result: [[10, 12], [20, 22]]
// Only the overlapping time ranges
```

### difference

Remove intervals from one tree that overlap with another:

```typescript
const fullDay = IntervalTree.fromTuples([[0, 24]])  // Entire day

const meetings = IntervalTree.fromTuples([
  [9, 10],   // 9am meeting
  [14, 15],  // 2pm meeting
])

const freeTime = fullDay.difference(meetings)
// Result: [[0, 9], [10, 14], [15, 24]]
// Available time slots
```

## Real-World Examples

### Scheduling System

```typescript
interface Meeting {
  title: string
  attendees: string[]
  room: string
}

const calendar = new IntervalTree<Meeting>()

calendar.addInterval(9, 10, {
  title: 'Daily Standup',
  attendees: ['Alice', 'Bob', 'Charlie'],
  room: 'Conference A'
})

calendar.addInterval(14, 15.5, {
  title: 'Code Review',
  attendees: ['Alice', 'David'],
  room: 'Conference B'
})

// Check if 11am is free
if (!calendar.contains(11)) {
  console.log('11am is available!')
}

// Find all afternoon meetings
const afternoon = calendar.searchOverlap(12, 18)
afternoon.forEach(interval => {
  console.log(interval.data?.title)
})

// Iterate through all meetings
for (const meeting of calendar) {
  console.log(`${meeting.data?.title} in ${meeting.data?.room}`)
}
```

### Time Range Management

```typescript
const workWeek = IntervalTree.fromTuples([
  [1, 6],  // Monday-Friday
])

const holidays = IntervalTree.fromTuples([
  [3, 4],  // Wednesday holiday
])

const workDays = workWeek.difference(holidays)
// Result: [[1, 3], [4, 6]]
// Monday-Tuesday and Thursday-Friday
```

### Resource Allocation

```typescript
const server1 = IntervalTree.fromTuples<string>([
  [0, 100, 'Job A'],
  [150, 300, 'Job B'],
])

const server2 = IntervalTree.fromTuples<string>([
  [50, 200, 'Job C'],
  [250, 350, 'Job D'],
])

// Find resource conflicts
const conflicts = server1.intersection(server2)
if (!conflicts.isEmpty) {
  console.log('Resource conflict detected!')
}

// Get all jobs across both servers
const allJobs = server1.union(server2)
for (const job of allJobs) {
  console.log(job.data)
}
```

## Interval Semantics

This library uses **half-open intervals** `[start, end)` where:
- `start` is **inclusive** (inside the interval)
- `end` is **exclusive** (outside the interval)

**Examples:**
- `Interval(1, 5)` contains points 1, 2, 3, 4 (but **not** 5)
- `interval.containsPoint(1)` → `true`
- `interval.containsPoint(5)` → `false`
- `interval.length` → `4` (simply `end - start`, no +1 needed)

**Why half-open intervals?**
1. **Length calculation**: Just `end - start` (no off-by-one errors)
2. **Adjacent intervals**: `[1, 5)` and `[5, 10)` don't overlap
3. **Empty intervals**: `[5, 5)` is naturally empty
4. **Consistency**: Matches JavaScript conventions (`Array.slice`, `substring`, etc.)

This follows the recommendation from Edsger W. Dijkstra's 1982 note on interval notation and is used by most programming languages and CS literature.
