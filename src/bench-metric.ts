/**
 * Benchmark for autoresearch: outputs raw timing numbers.
 * Uses a fixed seed for deterministic interval generation.
 */
import { compareIntervals } from './compareIntervals'
import { Interval } from './Interval'
import { IntervalTree } from './IntervalTree'

const numIntervals = 10_000
const numQueries = 10_000
const intervalRangeSize = 1_000_000

// Simple seeded PRNG (mulberry32)
function mulberry32(seed: number) {
  return function () {
    seed |= 0
    seed = (seed + 0x6D2B79F5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const rand = mulberry32(42)

// Generate deterministic intervals
const allIntervals: Interval[] = []
for (let i = 0; i < numIntervals; i++) {
  const start = Math.floor(rand() * intervalRangeSize)
  const end = start + Math.floor(rand() * 10000) + 1
  allIntervals.push(new Interval(start, end))
}
allIntervals.sort(compareIntervals)

// Generate deterministic query points
const queryPoints: number[] = []
for (let i = 0; i < numQueries; i++) {
  queryPoints.push(Math.floor(rand() * intervalRangeSize))
}

// Benchmark: build tree
const buildStart = performance.now()
const tree = new IntervalTree(allIntervals)
const buildEnd = performance.now()

// Benchmark: search
const searchStart = performance.now()
for (const point of queryPoints) {
  tree.searchPoint(point)
}
const searchEnd = performance.now()

const buildMs = (buildEnd - buildStart).toFixed(2)
const searchMs = (searchEnd - searchStart).toFixed(2)

// Output raw values for the shell script to collect
process.stdout.write(`BUILD_MS=${buildMs}\n`)
process.stdout.write(`SEARCH_MS=${searchMs}\n`)
