/* eslint-disable no-console */
/**
 * Compatibility smoke test for the built dist.
 * Runs against the packed tarball on the minimum supported Node (see package.json engines).
 */
import { Interval, IntervalTree } from 'intervaltree'

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

console.log('✅ ESM import works')
