import { describe, it } from 'vitest'
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
