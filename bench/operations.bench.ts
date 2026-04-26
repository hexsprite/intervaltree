import { bench, describe } from 'vitest'
import { Interval } from '../src/Interval'
import { IntervalTree } from '../src/IntervalTree'

function buildTree(count: number, span = 8, gap = 2): IntervalTree {
  const tree = new IntervalTree()
  for (let i = 0; i < count; i++) {
    const start = i * (span + gap)
    tree.add(new Interval(start, start + span))
  }
  return tree
}

function buildOverlapping(count: number): IntervalTree {
  const tree = new IntervalTree()
  for (let i = 0; i < count; i++) {
    tree.add(new Interval(i * 5, i * 5 + 20))
  }
  return tree
}

describe('add: 1k intervals', () => {
  bench('sequential', () => {
    const tree = new IntervalTree()
    for (let i = 0; i < 1000; i++) {
      tree.add(new Interval(i * 10, i * 10 + 8))
    }
  })
})

describe('searchOverlap: 10k tree', () => {
  const tree = buildTree(10000)
  bench('point query', () => {
    tree.searchOverlap(50000, 50100)
  })
  bench('wide query (10% of range)', () => {
    tree.searchOverlap(0, 10000)
  })
})

describe('searchPoint: 10k tree', () => {
  const tree = buildTree(10000)
  bench('hit', () => {
    tree.searchPoint(50001)
  })
  bench('miss', () => {
    tree.searchPoint(-1)
  })
})

describe('chop: 10k tree, single range', () => {
  bench('mid range', () => {
    const tree = buildTree(10000)
    tree.chop(40000, 60000)
  })
})

describe('chopAll: 10k tree, 100 ranges', () => {
  bench('clean tree', () => {
    const tree = buildTree(10000)
    const ranges: Array<[number, number]> = []
    for (let i = 0; i < 100; i++) ranges.push([i * 1000, i * 1000 + 50])
    tree.chopAll(ranges)
  })
})

describe('mergeOverlaps: 1k overlapping', () => {
  bench('rebuild', () => {
    const tree = buildOverlapping(1000)
    tree.mergeOverlaps()
  })
})

describe('intersection: 1k vs 1k', () => {
  const a = buildTree(1000, 8, 2)
  const b = buildTree(1000, 4, 6)
  bench('intersection', () => {
    a.intersection(b)
  })
})

describe('union: 1k + 1k', () => {
  const a = buildTree(1000, 8, 2)
  const b = buildTree(1000, 4, 6)
  bench('union', () => {
    a.union(b)
  })
})

describe('clone: 10k tree', () => {
  const tree = buildTree(10000)
  bench('clone', () => {
    tree.clone()
  })
})

describe('toArray: 10k tree', () => {
  const tree = buildTree(10000)
  bench('toArray', () => {
    tree.toArray()
  })
})

describe('hash: 10k tree', () => {
  const tree = buildTree(10000)
  bench('hash', () => {
    tree.hash()
  })
})

describe('equals: 10k vs 10k identical', () => {
  const a = buildTree(10000)
  const b = buildTree(10000)
  bench('equals', () => {
    a.equals(b)
  })
})
