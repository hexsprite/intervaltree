import { describe, expect, it } from 'vitest'
import { Interval } from './Interval'
import { IntervalTree } from './IntervalTree'

function buildTree(): IntervalTree {
  const tree = new IntervalTree()
  for (let i = 0; i < 20; i++)
    tree.add(new Interval(i, i + 3))
  return tree
}

const rootOf = (tree: IntervalTree): any => (tree as any).root

describe('verify() detects corruption', () => {
  it('passes on an intact tree', () => {
    expect(() => buildTree().verify()).not.toThrow()
  })

  // Symptom: verify() recomputed the height before comparing, so a stale height passed and was silently repaired.
  it('rejects a stale height and leaves it unrepaired', () => {
    const tree = buildTree()
    const node = rootOf(tree)._left
    const real = node.height
    node.height = real + 5
    expect(() => tree.verify()).toThrow(/height/)
    expect(node.height).toBe(real + 5)
  })

  // Symptom: a corrupt minStart passed verify(), and searchPoint(1) returned 0 hits instead of 2.
  it('rejects a wrong minStart', () => {
    const tree = buildTree()
    rootOf(tree)._left.minStart = 999
    expect(() => tree.verify()).toThrow(/minStart/)
  })

  it('rejects a wrong maxEnd', () => {
    const tree = buildTree()
    rootOf(tree)._left.maxEnd = -1
    expect(() => tree.verify()).toThrow(/maxEnd/)
  })

  it('rejects a wrong maxLength', () => {
    const tree = buildTree()
    rootOf(tree)._right.maxLength = 1000
    expect(() => tree.verify()).toThrow(/maxLength/i)
  })

  it('rejects children on the wrong sides', () => {
    const tree = buildTree()
    const root = rootOf(tree)
    ;[root._left, root._right] = [root._right, root._left]
    expect(() => tree.verify()).toThrow(/out of order/)
  })

  it('rejects same-start values not sorted by end', () => {
    const tree = new IntervalTree()
    tree.add(new Interval(5, 10))
    tree.add(new Interval(5, 8))
    rootOf(tree).values.reverse()
    expect(() => tree.verify()).toThrow(/sorted by end/)
  })

  // Symptom: `_size = 42` passed verify(), so size() lied.
  it('rejects a size that differs from the interval count', () => {
    const tree = buildTree()
    ;(tree as any)._size = 42
    expect(() => tree.verify()).toThrow(/size/i)
  })

  // Symptom: chopAll and difference fast paths build trees assuming no overlaps, so a lying clean flag corrupts them.
  it('rejects a clean tree that holds overlapping intervals', () => {
    const tree = buildTree()
    ;(tree as any)._dirty = false
    expect(() => tree.verify()).toThrow(/clean|overlap/i)
  })

  it('accepts a clean tree after mergeOverlaps', () => {
    const tree = buildTree()
    tree.mergeOverlaps()
    expect(() => tree.verify()).not.toThrow()
  })
})
