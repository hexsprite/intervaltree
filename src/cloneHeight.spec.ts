import { describe, expect, it } from 'vitest'
import { Interval } from './Interval'
import { IntervalTree } from './IntervalTree'

describe('clone preserves balance invariants', () => {
  // Symptom: clone() called updateAttributes() but not updateHeight().
  // Children's heights propagated correctly via recursion, but the parent
  // node's height stayed at the constructor default (1) — so subsequent
  // mutations on the clone computed balance against stale heights and
  // skipped rotations that should have fired.
  // Discovered by fast-check (seed 321924678) via difference + naive chop loop.
  it('cloned tree survives subsequent chop without rotation failure', () => {
    const tree = new IntervalTree()
    tree.add(new Interval(-162866047, 627024952))
    tree.add(new Interval(-2093466824, 0))
    tree.chop(0, 627024951)
    tree.add(new Interval(17895913, 893433749))
    tree.chop(17895914, 17895915)
    tree.chopAll([[893433747, 893433748], [-441780709, -162866048]])

    const clone = tree.clone()
    clone.chop(627024950, 627024951)
    clone.verify()
  })
})

describe('clone copies augmentation fields', () => {
  // Symptom guard for in-ba3: clone() copies minStart/maxEnd/maxLength/height
  // instead of recomputing them. verify() catches a field clone() forgets.
  // A clone that shared a node's value array would leak same-start adds into the source.
  it('adding to the clone leaves the source unchanged', () => {
    const tree = new IntervalTree<string>()
    let seed = 42
    const rand = () => (seed = (seed * 1103515245 + 12345) & 0x7FFFFFFF) / 0x7FFFFFFF
    for (let i = 0; i < 500; i++) {
      const start = Math.floor(rand() * 10_000)
      tree.add(new Interval(start, start + 1 + Math.floor(rand() * 500), `d${i % 7}`))
    }
    const before = tree.toTuples()
    const clone = tree.clone()
    clone.verify()

    // Same starts as stored intervals, so each add lands in an existing node.
    for (const [start, end] of before)
      clone.add(new Interval(start, end + 1000, 'clone'))
    clone.verify()

    expect(tree.toTuples()).toEqual(before)
    tree.verify()
  })
})
