import { bench, describe } from 'vitest'
import { Interval } from '../src/Interval'
import { IntervalTree } from '../src/IntervalTree'

function buildTree(count: number, span: number, gap: number): IntervalTree {
  const tree = new IntervalTree()
  for (let i = 0; i < count; i++) {
    const start = i * (span + gap)
    tree.add(new Interval(start, start + span))
  }
  return tree
}

function naiveDifference(a: IntervalTree, b: IntervalTree): IntervalTree {
  const result = a.clone()
  for (const iv of b.toArray()) {
    result.chop(iv.start, iv.end)
  }
  return result
}

describe('difference: 100 vs 100', () => {
  const a = buildTree(100, 8, 2)
  const b = buildTree(100, 4, 6)
  bench('fast (sweep-line)', () => {
    a.difference(b)
  })
  bench('naive (chop loop)', () => {
    naiveDifference(a, b)
  })
})

describe('difference: 1k vs 1k', () => {
  const a = buildTree(1000, 8, 2)
  const b = buildTree(1000, 4, 6)
  bench('fast (sweep-line)', () => {
    a.difference(b)
  })
  bench('naive (chop loop)', () => {
    naiveDifference(a, b)
  })
})

describe('difference: 10k vs 10k', () => {
  const a = buildTree(10000, 8, 2)
  const b = buildTree(10000, 4, 6)
  bench('fast (sweep-line)', () => {
    a.difference(b)
  })
  bench('naive (chop loop)', () => {
    naiveDifference(a, b)
  })
})

describe('difference: 10k vs 100 (sparse chops)', () => {
  const a = buildTree(10000, 8, 2)
  const b = buildTree(100, 4, 1000)
  bench('fast (sweep-line)', () => {
    a.difference(b)
  })
  bench('naive (chop loop)', () => {
    naiveDifference(a, b)
  })
})
