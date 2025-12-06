import { Interval } from './Interval'
import { IntervalTree } from './IntervalTree'

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

// Tests for new DX improvements

describe('typeScript Generics', () => {
  it('supports typed data', () => {
    interface Task {
      id: number
      name: string
    }

    const tree = new IntervalTree<Task>()
    tree.addInterval(1, 5, { id: 1, name: 'Task 1' })
    tree.addInterval(10, 15, { id: 2, name: 'Task 2' })

    const results = tree.searchPoint(3)
    expect(results[0].data?.id).toBe(1)
    expect(results[0].data?.name).toBe('Task 1')
  })

  it('supports fromTuples with typed data', () => {
    interface Event {
      type: string
      value: number
    }

    const tree = IntervalTree.fromTuples<Event>([
      [1, 5, { type: 'click', value: 100 }],
      [10, 15, { type: 'scroll', value: 200 }],
    ])

    const results = tree.searchPoint(12)
    expect(results[0].data?.type).toBe('scroll')
    expect(results[0].data?.value).toBe(200)
  })

  it('works without data', () => {
    const tree = new IntervalTree()
    tree.addInterval(1, 5)
    tree.addInterval(10, 15)

    expect(tree.size).toBe(2)
    expect(tree.searchPoint(3).length).toBe(1)
  })
})

describe('iterator Protocol', () => {
  it('supports for...of loops', () => {
    const tree = IntervalTree.fromTuples([
      [1, 5],
      [10, 15],
      [20, 25],
    ])

    const intervals: Array<[number, number]> = []
    for (const interval of tree) {
      intervals.push([interval.start, interval.end])
    }

    expect(intervals.length).toBe(3)
    expect(intervals).toContainEqual([1, 5])
    expect(intervals).toContainEqual([10, 15])
    expect(intervals).toContainEqual([20, 25])
  })

  it('supports spread operator', () => {
    const tree = IntervalTree.fromTuples([
      [1, 5],
      [10, 15],
    ])

    const intervals = [...tree]
    expect(intervals.length).toBe(2)
    expect(intervals[0]).toBeInstanceOf(Interval)
  })

  it('supports Array.from', () => {
    const tree = IntervalTree.fromTuples([
      [1, 5],
      [10, 15],
    ])

    const intervals = Array.from(tree)
    expect(intervals.length).toBe(2)
  })
})

describe('boolean Membership Checks', () => {
  it('contains() returns true for points in intervals', () => {
    const tree = IntervalTree.fromTuples([
      [1, 5],
      [10, 15],
    ])

    expect(tree.contains(3)).toBe(true)
    expect(tree.contains(12)).toBe(true)
  })

  it('contains() returns false for points not in intervals', () => {
    const tree = IntervalTree.fromTuples([
      [1, 5],
      [10, 15],
    ])

    expect(tree.contains(7)).toBe(false)
    expect(tree.contains(20)).toBe(false)
  })

  it('contains() returns false on end boundary (half-open intervals)', () => {
    const tree = IntervalTree.fromTuples([[1, 5]])
    expect(tree.contains(5)).toBe(false)
  })

  it('overlaps() returns true for overlapping ranges', () => {
    const tree = IntervalTree.fromTuples([
      [1, 5],
      [10, 15],
    ])

    expect(tree.overlaps(3, 7)).toBe(true)
    expect(tree.overlaps(12, 20)).toBe(true)
    expect(tree.overlaps(0, 3)).toBe(true)
  })

  it('overlaps() returns false for non-overlapping ranges', () => {
    const tree = IntervalTree.fromTuples([
      [1, 5],
      [10, 15],
    ])

    expect(tree.overlaps(6, 9)).toBe(false)
    expect(tree.overlaps(16, 20)).toBe(false)
  })

  it('isEmpty getter returns true for empty tree', () => {
    const tree = new IntervalTree()
    expect(tree.isEmpty).toBe(true)
  })

  it('isEmpty getter returns false for non-empty tree', () => {
    const tree = IntervalTree.fromTuples([[1, 5]])
    expect(tree.isEmpty).toBe(false)
  })
})

describe('forEach and map', () => {
  it('forEach iterates over all intervals', () => {
    const tree = IntervalTree.fromTuples([
      [1, 5],
      [10, 15],
      [20, 25],
    ])

    const starts: number[] = []
    tree.forEach((interval) => {
      starts.push(interval.start)
    })

    expect(starts.length).toBe(3)
    expect(starts).toContain(1)
    expect(starts).toContain(10)
    expect(starts).toContain(20)
  })

  it('forEach provides index', () => {
    const tree = IntervalTree.fromTuples([
      [1, 5],
      [10, 15],
    ])

    const indices: number[] = []
    tree.forEach((_, index) => {
      indices.push(index)
    })

    expect(indices).toEqual([0, 1])
  })

  it('map transforms intervals', () => {
    const tree = IntervalTree.fromTuples<string>([
      [1, 5, 'a'],
      [10, 15, 'b'],
    ])

    const shifted = tree.map(interval =>
      new Interval(interval.start + 10, interval.end + 10, interval.data),
    )

    expect(shifted.toTuples()).toEqual([
      [11, 15, 'a'],
      [20, 25, 'b'],
    ])
  })

  it('map can change data type', () => {
    const tree = IntervalTree.fromTuples<string>([
      [1, 5, 'a'],
      [10, 15, 'b'],
    ])

    const withNumbers = tree.map(interval =>
      new Interval<number>(interval.start, interval.end, interval.data?.length ?? 0),
    )

    const results = withNumbers.searchPoint(3)
    expect(results[0].data).toBe(1)
  })
})

describe('set Operations', () => {
  describe('union', () => {
    it('combines intervals from both trees', () => {
      const tree1 = IntervalTree.fromTuples([
        [1, 5],
        [10, 15],
      ])

      const tree2 = IntervalTree.fromTuples([
        [20, 25],
        [30, 35],
      ])

      const result = tree1.union(tree2)
      expect(result.size).toBe(4)
      expect(result.contains(3)).toBe(true)
      expect(result.contains(22)).toBe(true)
    })

    it('preserves duplicate intervals', () => {
      const tree1 = IntervalTree.fromTuples([[1, 5]])
      const tree2 = IntervalTree.fromTuples([[1, 5]])

      const result = tree1.union(tree2)
      expect(result.size).toBe(1) // Duplicates are ignored
    })

    it('works with typed data', () => {
      const tree1 = IntervalTree.fromTuples<string>([[1, 5, 'a']])
      const tree2 = IntervalTree.fromTuples<string>([[10, 15, 'b']])

      const result = tree1.union(tree2)
      expect(result.toTuples()).toEqual([
        [1, 5, 'a'],
        [10, 15, 'b'],
      ])
    })
  })

  describe('intersection', () => {
    it('returns overlapping regions', () => {
      const tree1 = IntervalTree.fromTuples([
        [1, 10],
        [20, 30],
      ])

      const tree2 = IntervalTree.fromTuples([
        [5, 15],
        [25, 35],
      ])

      const result = tree1.intersection(tree2)
      expect(result.toTuples()).toEqual([
        [5, 10],
        [25, 30],
      ])
    })

    it('returns empty tree for non-overlapping trees', () => {
      const tree1 = IntervalTree.fromTuples([[1, 5]])
      const tree2 = IntervalTree.fromTuples([[10, 15]])

      const result = tree1.intersection(tree2)
      expect(result.isEmpty).toBe(true)
    })

    it('handles multiple overlaps', () => {
      const tree1 = IntervalTree.fromTuples([[1, 20]])

      const tree2 = IntervalTree.fromTuples([
        [3, 7],
        [10, 15],
      ])

      const result = tree1.intersection(tree2)
      expect(result.size).toBe(2)
      expect(result.toTuples()).toEqual([
        [3, 7],
        [10, 15],
      ])
    })

    it('preserves data from first tree', () => {
      const tree1 = IntervalTree.fromTuples<string>([[1, 10, 'first']])
      const tree2 = IntervalTree.fromTuples<string>([[5, 15, 'second']])

      const result = tree1.intersection(tree2)
      expect(result.toTuples()).toEqual([[5, 10, 'first']])
    })
  })

  describe('difference', () => {
    it('returns intervals not in second tree', () => {
      const tree1 = IntervalTree.fromTuples([[1, 20]])
      const tree2 = IntervalTree.fromTuples([[5, 10]])

      const result = tree1.difference(tree2)
      expect(result.toTuples()).toEqual([
        [1, 5],
        [10, 20],
      ])
    })

    it('returns all intervals if no overlap', () => {
      const tree1 = IntervalTree.fromTuples([[1, 5]])
      const tree2 = IntervalTree.fromTuples([[10, 15]])

      const result = tree1.difference(tree2)
      expect(result.toTuples()).toEqual([[1, 5]])
    })

    it('returns empty tree if completely overlapped', () => {
      const tree1 = IntervalTree.fromTuples([[5, 10]])
      const tree2 = IntervalTree.fromTuples([[1, 20]])

      const result = tree1.difference(tree2)
      expect(result.isEmpty).toBe(true)
    })

    it('handles multiple removals', () => {
      const tree1 = IntervalTree.fromTuples([[1, 100]])
      const tree2 = IntervalTree.fromTuples([
        [10, 20],
        [30, 40],
        [50, 60],
      ])

      const result = tree1.difference(tree2)
      expect(result.toTuples()).toEqual([
        [1, 10],
        [20, 30],
        [40, 50],
        [60, 100],
      ])
    })

    it('preserves data', () => {
      const tree1 = IntervalTree.fromTuples<string>([[1, 20, 'keep']])
      const tree2 = IntervalTree.fromTuples<string>([[5, 10, 'remove']])

      const result = tree1.difference(tree2)
      expect(result.toArray()[0].data).toBe('keep')
    })
  })
})

describe('real-world use cases', () => {
  it('works with scheduling system', () => {
    interface Meeting {
      title: string
      attendees: number
    }

    const schedule = new IntervalTree<Meeting>()
    schedule.addInterval(9, 10, { title: 'Standup', attendees: 5 })
    schedule.addInterval(14, 15, { title: 'Review', attendees: 3 })

    // Check if time slot is available
    expect(schedule.contains(11)).toBe(false) // 11am is free
    expect(schedule.contains(9.5)).toBe(true) // 9:30am is busy

    // Find all meetings in afternoon
    const afternoon = schedule.searchOverlap(12, 17)
    expect(afternoon.length).toBe(1)
    expect(afternoon[0].data?.title).toBe('Review')
  })

  it('works with date ranges', () => {
    const jan1 = new Date('2024-01-01').getTime()
    const jan10 = new Date('2024-01-10').getTime()
    const feb1 = new Date('2024-02-01').getTime()
    const feb10 = new Date('2024-02-10').getTime()

    const events = new IntervalTree<string>()
    events.addInterval(jan1, jan10, 'Winter Sale')
    events.addInterval(feb1, feb10, 'Valentine Promo')

    const jan5 = new Date('2024-01-05').getTime()
    expect(events.contains(jan5)).toBe(true)

    // Iterate over events
    const eventNames: string[] = []
    for (const event of events) {
      if (event.data) {
        eventNames.push(event.data)
      }
    }
    expect(eventNames).toEqual(['Winter Sale', 'Valentine Promo'])
  })

  it('handles resource allocation', () => {
    const server1 = IntervalTree.fromTuples<string>([
      [0, 5, 'Job A'],
      [10, 15, 'Job B'],
    ])

    const server2 = IntervalTree.fromTuples<string>([
      [3, 8, 'Job C'],
      [12, 17, 'Job D'],
    ])

    // Find conflicts
    const conflicts = server1.intersection(server2)
    expect(conflicts.size).toBeGreaterThan(0)

    // Combine all jobs
    const allJobs = server1.union(server2)
    expect(allJobs.size).toBe(4)
  })
})
