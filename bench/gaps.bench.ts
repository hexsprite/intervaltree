import { bench, describe } from 'vitest'
import { gaps } from '../src/gaps'
import { Interval } from '../src/Interval'
import { IntervalTree } from '../src/IntervalTree'

// 10k merged (non-overlapping) intervals, matching the "merged ranges"
// input-domain decision in docs/design/gaps.md.
function buildMergedTree(count: number, span: number, gap: number): IntervalTree {
  const tree = new IntervalTree()
  for (let i = 0; i < count; i++) {
    const start = i * (span + gap)
    tree.add(new Interval(start, start + span))
  }
  return tree
}

const COUNT = 10_000
const SPAN = 8
const GAP = 2
const TOTAL = COUNT * (SPAN + GAP)

const tree = buildMergedTree(COUNT, SPAN, GAP)

function baselineGaps(t: IntervalTree, start: number, end: number) {
  const fullRange = IntervalTree.fromTuples([[start, end]])
  return fullRange.difference(t).toArray()
}

describe('gaps: 10k merged intervals, 1% window', () => {
  const start = 0
  const end = Math.floor(TOTAL * 0.01)

  bench('gaps (single sweep)', () => {
    gaps(tree, start, end)
  })
  bench('baseline (fullRange.difference)', () => {
    baselineGaps(tree, start, end)
  })
})

describe('gaps: 10k merged intervals, 100% window', () => {
  const start = 0
  const end = TOTAL

  bench('gaps (single sweep)', () => {
    gaps(tree, start, end)
  })
  bench('baseline (fullRange.difference)', () => {
    baselineGaps(tree, start, end)
  })
})
