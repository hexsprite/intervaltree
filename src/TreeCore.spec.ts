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
    const a = new Interval(1, 5, 'a')
    const core = TreeCore.from<string>([a, new Interval(1, 5, 'a'), new Interval(1, 5, 'b'), new Interval(0, 2)])
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
