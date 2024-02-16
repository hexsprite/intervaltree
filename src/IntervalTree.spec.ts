import { IntervalTree } from './IntervalTree'
import { Interval } from './Interval'

it('find intervals of minimum length', () => {
  const tree = IntervalTree.fromTuples([
    [0, 1],
    [2, 4],
    [5, 8],
    [9, 13],
    [14, 19],
    [11, 17],
  ])

  expect(tree.findOneByLengthStartingAt(3, 12)).toEqual(
    new Interval(12, 17),
  )
})

it('duplicate intervals are ignored', () => {
  const tree = new IntervalTree()
  tree.addInterval(0, 1)
  tree.addInterval(0, 1)
  tree.addInterval(0, 1)
  tree.addInterval(0, 1)

  expect(tree.toArray().length).toBe(1)
})

it('merges overlapping intervals', () => {
  const tree = IntervalTree.fromTuples(
    [
      [1, 5],
      [5, 9],
      [15, 19],
      [19, 25],
    ],
  )
  tree.mergeOverlaps()
  expect(tree.toTuples()).toEqual(
    [[1, 9], [15, 25]],
  )
})

it('merge bugs', () => {
  const intervals: Array<[number, number]> = [
    [228070800000, 228099600000],
    [227898000000, 227926800000],
    [227833200000, 227840400000],
    [227984400000, 228013200000],
    [228589200000, 228618000000],
    [228416400000, 228445200000],
    [228157200000, 228186000000],
    [228502800000, 228531600000],
    [228675600000, 228704400000],
    [228762000000, 228790800000],
  ]

  const tree = IntervalTree.fromTuples(intervals)
  tree.mergeOverlaps()
  expect(tree.toTuples()).toEqual(
    [
      [227833200000, 227840400000],
      [227898000000, 227926800000],
      [227984400000, 228013200000],
      [228070800000, 228099600000],
      [228157200000, 228186000000],
      [228416400000, 228445200000],
      [228502800000, 228531600000],
      [228589200000, 228618000000],
      [228675600000, 228704400000],
      [228762000000, 228790800000],
    ],
  )
})

it('chops tree', () => {
  const tree = new IntervalTree()
  tree.addInterval(0, 10)
  tree.chop(3, 7)
  expect(tree.toTuples()).toEqual(
    [[0, 3], [7, 10]],
  )
})

it('chops bigger things', () => {
  const allIntervals: Array<[number, number]> = [
    [1481157540000, 1481158800000],
    [1481216400000, 1481234400000],
    [1481239800000, 1481245200000],
    [1481302800000, 1481320800000],
    [1481326200000, 1481331600000],
    [1481389200000, 1481418000000],
    [1481475600000, 1481504400000],
    [1481562000000, 1481580000000],
    [1481585400000, 1481590800000],
    [1481648400000, 1481677200000],
    [1481734800000, 1481752800000],
    [1481758200000, 1481763600000],
    [1481821200000, 1481839200000],
    [1481844600000, 1481850000000],
    [1481907600000, 1481936400000],
    [1481994000000, 1482022800000],
    [1482080400000, 1482109200000],
    [1482166800000, 1482195600000],
    [1482253200000, 1482282000000],
    [1482253200000, 1483344000000],
  ]
  const tree = IntervalTree.fromTuples(allIntervals)
  tree.chop(1482220800000, 1482253200000)

  // ranges before the chop start should not be affected
  expect(tree.toSorted()[0].start).toBe(1481157540000)

  // ranges after the chop end should not be affected
  expect(tree.toSorted().at(-1)?.end).toBe(1483344000000)

  expect(tree.toTuples()).toStrictEqual([
    [1481157540000, 1481158800000],
    [1481216400000, 1481234400000],
    [1481239800000, 1481245200000],
    [1481302800000, 1481320800000],
    [1481326200000, 1481331600000],
    [1481389200000, 1481418000000],
    [1481475600000, 1481504400000],
    [1481562000000, 1481580000000],
    [1481585400000, 1481590800000],
    [1481648400000, 1481677200000],
    [1481734800000, 1481752800000],
    [1481758200000, 1481763600000],
    [1481821200000, 1481839200000],
    [1481844600000, 1481850000000],
    [1481907600000, 1481936400000],
    [1481994000000, 1482022800000],
    [1482080400000, 1482109200000],
    [1482166800000, 1482195600000],
    [1482253200000, 1482282000000],
    [1482253200000, 1483344000000],
  ])
})

it('chops in the past', () => {
  const allIntervals: Array<[number, number]> = [
    [227833200000, 227840400000],
    [227923200000, 227926800000],
    [227984400000, 228013200000],
    [228070800000, 228099600000],
    [228157200000, 228186000000],
    [228416400000, 228445200000],
    [228502800000, 228531600000],
    [228589200000, 228618000000],
    [228675600000, 228704400000],
    [228762000000, 228790800000],
    [229021200000, 229050000000],
  ]
  const tree = IntervalTree.fromTuples(allIntervals)
  tree.chop(0, 227923200000)
  expect(tree.toSorted()[0].start).toBe(227923200000)
})

it('chops the ends', () => {
  const tree = IntervalTree.fromTuples([
    [227833200000, 227840400000],
    [227898000000, 227926800000],
    [227984400000, 228013200000],
    [228070800000, 228099600000],
    [228157200000, 228186000000],
    [228416400000, 228445200000],
    [228502800000, 228531600000],
    [228589200000, 228618000000],
    [228675600000, 228704400000],
    [228762000000, 228790800000],
    [228790800000, 228988800000],
  ])
  tree.chop(228790800000, 228988800000)
  expect(tree.toSorted().at(-1)?.end).toBe(228790800000)
})

it('remove top node with succesor with branches from tree', () => {
  const tree = new IntervalTree()
  tree.addInterval(1, 10)
  tree.addInterval(-1, 5)
  tree.addInterval(5, 15)
  tree.addInterval(6, 17)
  tree.addInterval(7, 20)
  tree.remove(new Interval(1, 10))
})

it('chops single non-overlapping interval', () => {
  const tree = new IntervalTree()
  tree.addInterval(1, 10)
  tree.chop(3, 7)
  expect(tree.toArray()).toEqual([new Interval(1, 3), new Interval(7, 10)])
})

it('chop single overlapping interval', () => {
  const tree = new IntervalTree()
  tree.addInterval(1, 10)
  tree.chop(-5, 7)
  expect(tree.toArray()).toEqual([new Interval(7, 10)])
})

it('chop enveloped interval', () => {
  const tree = new IntervalTree()
  tree.addInterval(5, 10)
  tree.addInterval(1, 3)
  tree.chop(4, 15)
  expect(tree.toArray()).toEqual([new Interval(1, 3)])
})

it('chop other intervals', () => {
  const tree = IntervalTree.fromTuples([
    [-1914885195, 1622011184],
    [-245889069, 502292672],
    [-793340433, 1961265072],
    [2033098477, 2083655309],
    [2073158254, 2112309403],
  ])
  tree.chop(-544270694, 1383614511)
  expect(tree.toTuples()).toEqual([
    [-1914885195, -544270694],
    [-793340433, -544270694],
    [1383614511, 1622011184],
    [1383614511, 1961265072],
    [2033098477, 2083655309],
    [2073158254, 2112309403],
  ])
  tree.chop(-1733356979, -36092701)
  expect(tree.toTuples()).toEqual([
    [-1914885195, -1733356979],
    [1383614511, 1622011184],
    [1383614511, 1961265072],
    [2033098477, 2083655309],
    [2073158254, 2112309403],
  ])
})

it('merges overlapping intervals 2', () => {
  const tree = IntervalTree.fromTuples([
    [1, 5],
    [5, 9],
    [15, 19],
    [19, 25],
  ])
  tree.mergeOverlaps()
  expect(tree.toTuples()).toEqual([
    [1, 9],
    [15, 25],
  ])
})

it('merges overlapping intervals with data', () => {
  const tree = new IntervalTree()
  tree.addInterval(1, 5)
  tree.addInterval(5, 9)
  tree.addInterval(15, 19)
  tree.addInterval(19, 25, 'i')
  tree.mergeOverlaps()
  expect(tree.toTuples()).toEqual([
    [1, 9],
    [15, 25],
  ])
})
