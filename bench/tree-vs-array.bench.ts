import { bench, describe } from 'vitest'
import { ArrayIntervalCollection } from '../src/ArrayIntervalCollection'
import { compareIntervals } from '../src/compareIntervals'
import { Interval } from '../src/Interval'
import { IntervalTree } from '../src/IntervalTree'

const numIntervals = 10_000
const numQueries = 10_000
const intervalRangeSize = 1_000_000

function generateRandomIntervals(count: number): Interval[] {
  const intervals: Interval[] = []
  for (let i = 0; i < count; i++) {
    const start = Math.floor(Math.random() * intervalRangeSize)
    const end = start + Math.floor(Math.random() * 10000) + 1 // Ensure end > start
    intervals.push(new Interval(start, end))
  }
  intervals.sort(compareIntervals)
  return intervals
}

describe('tree vs array, 10k intervals', () => {
  const allIntervals = generateRandomIntervals(numIntervals)
  const tree = new IntervalTree(allIntervals)
  const array = new ArrayIntervalCollection(allIntervals)

  bench('searchPoint (tree)', () => {
    for (let i = 0; i < numQueries; i++) {
      const point = Math.floor(Math.random() * intervalRangeSize)
      tree.searchPoint(point)
    }
  })

  bench('searchPoint (array)', () => {
    for (let i = 0; i < numQueries; i++) {
      const point = Math.floor(Math.random() * intervalRangeSize)
      array.searchPoint(point)
    }
  })

  bench('searchOverlap (tree)', () => {
    for (let i = 0; i < numQueries; i++) {
      const start = Math.floor(Math.random() * intervalRangeSize)
      const end = start + Math.floor(Math.random() * 10000) + 1
      tree.searchOverlap(start, end)
    }
  })

  bench('searchOverlap (array)', () => {
    for (let i = 0; i < numQueries; i++) {
      const start = Math.floor(Math.random() * intervalRangeSize)
      const end = start + Math.floor(Math.random() * 10000) + 1
      array.toArray().filter(iv => iv.overlapsWith(start, end))
    }
  })

  bench('add (tree)', () => {
    const t = new IntervalTree()
    for (const interval of allIntervals) t.add(interval)
  })

  bench('add (array)', () => {
    const a = new ArrayIntervalCollection()
    for (const interval of allIntervals) a.add(interval)
  })

  bench('chop (tree)', () => {
    const t = new IntervalTree(allIntervals)
    t.chop(400000, 600000)
  })

  bench('chop (array)', () => {
    const a = new ArrayIntervalCollection(allIntervals.slice())
    a.chop(400000, 600000)
  })
})
