import { Interval } from './Interval'
import { TreeCore } from './TreeCore'

describe('treeCore insert and remove report what changed', () => {
  it('insert returns false on a duplicate and leaves the size alone', () => {
    const core = TreeCore.from<string>([])
    expect(core.insert(new Interval(1, 5, 'a'))).toBe(true)
    expect(core.insert(new Interval(1, 5, 'a'))).toBe(false)
    expect(core.size).toBe(1)
    core.verify()
  })

  it('insert returns true for the same bounds with different data', () => {
    const core = TreeCore.from<string>([new Interval(1, 5, 'a')])
    expect(core.insert(new Interval(1, 5, 'b'))).toBe(true)
    expect(core.size).toBe(2)
    core.verify()
  })

  it('remove returns false when the interval is absent', () => {
    const core = TreeCore.from<string>([new Interval(1, 5, 'a')])
    expect(core.remove(new Interval(1, 5, 'b'))).toBe(false)
    expect(core.remove(new Interval(1, 6, 'a'))).toBe(false)
    expect(core.remove(new Interval(2, 5, 'a'))).toBe(false)
    expect(core.size).toBe(1)
    expect(core.remove(new Interval(1, 5, 'a'))).toBe(true)
    expect(core.remove(new Interval(1, 5, 'a'))).toBe(false)
    expect(core.size).toBe(0)
    expect(core.isEmpty).toBe(true)
    core.verify()
  })

  it('keeps size equal to the stored count over a seeded random run', () => {
    let seed = 7
    const rand = (n: number) => {
      seed = (seed * 1103515245 + 12345) & 0x7FFFFFFF
      return seed % n
    }
    const core = TreeCore.from<number>([])
    const pool: Interval<number>[] = []
    for (let i = 0; i < 2000; i++) {
      // Small ranges force duplicates, shared starts, and misses.
      const start = rand(50)
      const iv = new Interval(start, start + 1 + rand(5), rand(3))
      if (rand(3) === 0 && pool.length > 0)
        core.remove(pool[rand(pool.length)])
      else
        core.insert(iv)
      pool.push(iv)
      expect(core.size).toBe(core.toArray().length)
    }
    core.verify()
  })
})

describe('treeCore.from', () => {
  it('builds an empty core from an empty array', () => {
    const core = TreeCore.from([])
    expect(core.size).toBe(0)
    expect(core.isEmpty).toBe(true)
    expect(core.toArray()).toEqual([])
    expect(core.first()).toBeNull()
    expect(core.last()).toBeNull()
    core.verify()
  })

  it('drops duplicates and counts the rest', () => {
    const core = TreeCore.from<string>([new Interval(1, 5, 'a'), new Interval(1, 5, 'a'), new Interval(1, 5, 'b'), new Interval(0, 2)])
    expect(core.size).toBe(3)
    expect(core.toArray().map(iv => iv.toTuple())).toEqual([[0, 2], [1, 5, 'a'], [1, 5, 'b']])
    core.verify()
  })

  it('fromSortedDistinctStarts builds an empty core from an empty array', () => {
    const core = TreeCore.fromSortedDistinctStarts([])
    expect(core.isEmpty).toBe(true)
    core.verify()
  })
})

// verify() checks every height, balance, and augmentation field, so these tests assert no tree shape.
const tuples = (core: TreeCore<unknown>) => core.toArray().map(iv => iv.toTuple())

function coreWithUnitStarts(starts: number[]): TreeCore<unknown> {
  const core = TreeCore.from<unknown>([])
  for (const start of starts) {
    core.insert(new Interval(start, start + 1))
    core.verify()
  }
  return core
}

describe('treeCore AVL rotations', () => {
  // Each order of starts 1, 2, 3 leaves one node with balance 2, so it forces one rotation kind.
  const cases: Array<[string, number[]]> = [
    ['rotates left on a right-right insertion (1, 2, 3)', [1, 2, 3]],
    ['rotates right on a left-left insertion (3, 2, 1)', [3, 2, 1]],
    ['rotates right-left on a right-left insertion (1, 3, 2)', [1, 3, 2]],
    ['rotates left-right on a left-right insertion (3, 1, 2)', [3, 1, 2]],
  ]
  for (const [name, starts] of cases) {
    it(name, () => {
      expect(tuples(coreWithUnitStarts(starts))).toEqual([[1, 2], [2, 3], [3, 4]])
    })
  }

  it('stays balanced after ascending inserts 1..7', () => {
    const core = coreWithUnitStarts([1, 2, 3, 4, 5, 6, 7])
    expect(core.size).toBe(7)
  })
})

describe('successor graft height', () => {
  // Regression: successor graft relied on rotate() to repair a stale cloned height.
  it('keeps heights and balance correct after removing a two-child node whose successor has no left child', () => {
    const core = coreWithUnitStarts([50, 25, 75, 60, 90, 55, 65])

    // Remove 75: two children, successor is 90 (no left child).
    expect(core.remove(new Interval(75, 76))).toBe(true)
    core.verify()

    // Remove 50: two children, successor is 55.
    expect(core.remove(new Interval(50, 51))).toBe(true)
    core.verify()
    expect(tuples(core)).toEqual([[25, 26], [55, 56], [60, 61], [65, 66], [90, 91]])
  })

  // The successor node moves up with every value it holds, not just the first.
  it('keeps every value of a multi-value successor', () => {
    const core = coreWithUnitStarts([50, 25, 75, 60, 90])
    core.insert(new Interval(60, 70))
    core.insert(new Interval(60, 80, 'x'))

    // Remove 50: two children, successor is the 60 node with three values.
    expect(core.remove(new Interval(50, 51))).toBe(true)
    core.verify()
    expect(tuples(core)).toEqual([[25, 26], [60, 61], [60, 70], [60, 80, 'x'], [75, 76], [90, 91]])
  })
})
