/**
 * Compatibility smoke test for the built dist.
 * Runs against Node 14+ to verify the package works on older runtimes.
 */
const { IntervalTree, Interval, compareIntervals } = require('../dist/index.cjs')

// Basic construction
const tree = new IntervalTree()
console.log('✓ IntervalTree constructed')

// Add intervals
tree.add(new Interval(0, 10))
tree.add(new Interval(5, 15))
tree.add(new Interval(20, 30))
console.log('✓ Intervals added')

// Search
const results = tree.searchPoint(7)
if (results.length !== 2) {
  throw new Error(`Expected 2 results, got ${results.length}`)
}
console.log('✓ searchPoint works')

// toArray
const all = tree.toArray()
if (all.length !== 3) {
  throw new Error(`Expected 3 intervals, got ${all.length}`)
}
console.log('✓ toArray works')

// Remove
tree.remove(results[0])
if (tree.toArray().length !== 2) {
  throw new Error('Remove failed')
}
console.log('✓ remove works')

// Clone
const cloned = tree.clone()
if (cloned.toArray().length !== 2) {
  throw new Error('Clone failed')
}
console.log('✓ clone works')

// compareIntervals
const sorted = [new Interval(10, 20), new Interval(5, 15)].sort(compareIntervals)
if (sorted[0].start !== 5) {
  throw new Error('compareIntervals failed')
}
console.log('✓ compareIntervals works')

// Constructor with intervals
const tree2 = new IntervalTree([new Interval(1, 2), new Interval(3, 4)])
if (tree2.size !== 2) {
  throw new Error('Constructor with intervals failed')
}
console.log('✓ Constructor with intervals works')

console.log('\n✅ All compatibility tests passed!')
