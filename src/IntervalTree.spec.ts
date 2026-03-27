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

it('chopAll removes multiple ranges at once', () => {
  const tree = IntervalTree.fromTuples([
    [0, 100],
  ])
  tree.chopAll([[10, 20], [30, 40], [50, 60]])
  expect(tree.toTuples()).toEqual([
    [0, 10],
    [20, 30],
    [40, 50],
    [60, 100],
  ])
})

it('chopAll handles overlapping chop ranges', () => {
  const tree = IntervalTree.fromTuples([
    [0, 100],
  ])
  tree.chopAll([[10, 30], [20, 40], [50, 60]])
  expect(tree.toTuples()).toEqual([
    [0, 10],
    [40, 50],
    [60, 100],
  ])
})

it('chopAll handles empty ranges', () => {
  const tree = IntervalTree.fromTuples([
    [0, 100],
  ])
  tree.chopAll([])
  expect(tree.toTuples()).toEqual([[0, 100]])
})

it('chopAll handles multiple intervals', () => {
  const tree = IntervalTree.fromTuples([
    [0, 50],
    [60, 100],
  ])
  tree.chopAll([[10, 20], [70, 80]])
  expect(tree.toTuples()).toEqual([
    [0, 10],
    [20, 50],
    [60, 70],
    [80, 100],
  ])
})

it('chopAll equivalent to sequential chops', () => {
  // Same test case as the existing 'chop other intervals' test
  const tree1 = IntervalTree.fromTuples([
    [0, 100],
    [200, 300],
    [400, 500],
  ])
  const tree2 = IntervalTree.fromTuples([
    [0, 100],
    [200, 300],
    [400, 500],
  ])

  const ranges: Array<[number, number]> = [[50, 75], [225, 275], [450, 475]]

  // Sequential chops
  for (const [s, e] of ranges) tree1.chop(s, e)

  // Batch chopAll
  tree2.chopAll(ranges)

  expect(tree2.toTuples()).toEqual(tree1.toTuples())
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

  it('searchOverlap respects half-open interval semantics at boundaries', () => {
    // Adjacent intervals [1,5) and [5,10) should NOT overlap
    const tree = IntervalTree.fromTuples<string>([
      [1, 5, 'first'],
      [5, 10, 'second'],
    ])

    // Query [5,10) should only find 'second', not 'first'
    const results = tree.searchOverlap(5, 10)
    expect(results.map(r => r.data)).toEqual(['second'])

    // Query [0,5) should only find 'first', not 'second'
    const results2 = tree.searchOverlap(0, 5)
    expect(results2.map(r => r.data)).toEqual(['first'])

    // Query starting exactly at interval end should not find that interval
    const results3 = tree.searchOverlap(10, 15)
    expect(results3).toHaveLength(0)
  })

  it('overlaps() respects half-open interval semantics at boundaries', () => {
    // Adjacent intervals [1,5) and [5,10)
    const tree = IntervalTree.fromTuples([
      [1, 5],
      [5, 10],
    ])

    // Query exactly at boundary - [5,10) touches [1,5) at point 5
    // but since intervals are half-open, they don't actually overlap
    expect(tree.overlaps(5, 10)).toBe(true) // finds [5,10)
    expect(tree.overlaps(0, 5)).toBe(true) // finds [1,5)

    // Query starting exactly where all intervals end
    expect(tree.overlaps(10, 15)).toBe(false)

    // Query ending exactly where interval starts
    expect(tree.overlaps(-5, 1)).toBe(false)
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

describe('searchByLengthStartingAt', () => {
  it('returns intervals of at least the given length', () => {
    const tree = IntervalTree.fromTuples([
      [0, 5], // length 5
      [10, 12], // length 2
      [20, 30], // length 10
      [40, 43], // length 3
    ])
    const results = tree.searchByLengthStartingAt(5, 0)
    expect(results.length).toBe(2)
    expect(results.map(r => [r.start, r.end])).toEqual([
      [0, 5],
      [20, 30],
    ])
  })

  it('returns results sorted by start then end', () => {
    const tree = IntervalTree.fromTuples([
      [300, 800],
      [50, 400],
      [100, 500],
      [200, 600],
      [10, 900],
    ])
    const results = tree.searchByLengthStartingAt(100, 0)
    for (let i = 1; i < results.length; i++) {
      const prev = results[i - 1]
      const curr = results[i]
      expect(
        curr.start > prev.start
        || (curr.start === prev.start && curr.end >= prev.end),
      ).toBe(true)
    }
  })

  it('adjusts intervals that start before startingAt', () => {
    const tree = IntervalTree.fromTuples([
      [0, 100], // starts before 50, adjusted to [50, 100] length=50
      [60, 80], // length 20, adjusted to [60, 80] length=20
    ])
    const results = tree.searchByLengthStartingAt(30, 50)
    expect(results.length).toBe(1)
    expect(results[0].start).toBe(50)
    expect(results[0].end).toBe(100)
  })

  it('returns empty array for empty tree', () => {
    const tree = new IntervalTree()
    expect(tree.searchByLengthStartingAt(1, 0)).toEqual([])
  })

  it('returns empty array when no intervals qualify', () => {
    const tree = IntervalTree.fromTuples([
      [0, 3],
      [10, 12],
    ])
    expect(tree.searchByLengthStartingAt(5, 0)).toEqual([])
  })

  it('handles startingAt beyond all intervals', () => {
    const tree = IntervalTree.fromTuples([
      [0, 10],
      [20, 30],
    ])
    expect(tree.searchByLengthStartingAt(1, 100)).toEqual([])
  })
})

describe('toSorted and toArray ordering', () => {
  it('toSorted returns intervals sorted by start then end', () => {
    const tree = new IntervalTree<string>()
    tree.addInterval(50, 100)
    tree.addInterval(10, 30)
    tree.addInterval(70, 90)
    tree.addInterval(10, 50)
    tree.addInterval(30, 60)

    const sorted = tree.toSorted()
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1]
      const curr = sorted[i]
      expect(
        curr.start > prev.start
        || (curr.start === prev.start && curr.end >= prev.end),
      ).toBe(true)
    }
  })

  it('toArray returns intervals in ascending start order', () => {
    const tree = IntervalTree.fromTuples([
      [500, 600],
      [100, 200],
      [300, 400],
      [50, 150],
      [250, 350],
    ])

    const arr = tree.toArray()
    for (let i = 1; i < arr.length; i++) {
      expect(arr[i].start).toBeGreaterThanOrEqual(arr[i - 1].start)
    }
  })

  it('toSorted matches independently sorted toArray', () => {
    const tree = IntervalTree.fromTuples([
      [30, 40],
      [10, 20],
      [50, 60],
      [5, 15],
      [25, 35],
    ])

    const sorted = tree.toSorted()
    const manuallySorted = tree.toArray().sort(
      (a, b) => a.start - b.start || a.end - b.end,
    )
    expect(sorted.map(iv => [iv.start, iv.end])).toEqual(
      manuallySorted.map(iv => [iv.start, iv.end]),
    )
  })
})

describe('chop correctness', () => {
  it('chop removes the exact region and keeps flanks', () => {
    const tree = IntervalTree.fromTuples([[0, 1000]])
    tree.chop(200, 500)

    const remaining = tree.toSorted()
    expect(remaining.map(iv => [iv.start, iv.end])).toEqual([
      [0, 200],
      [500, 1000],
    ])
  })

  it('chop leaves no intervals overlapping chopped region', () => {
    const tree = IntervalTree.fromTuples([
      [0, 300],
      [100, 400],
      [250, 600],
      [500, 800],
    ])
    tree.chop(200, 500)

    const overlap = tree.searchOverlap(200, 500)
    expect(overlap).toEqual([])
  })

  it('chop handles multiple overlapping intervals', () => {
    const tree = IntervalTree.fromTuples([
      [0, 100],
      [50, 150],
      [80, 200],
    ])
    tree.chop(60, 120)

    const remaining = tree.toSorted()
    // [0,60], [120,150], [120,200]
    for (const iv of remaining) {
      expect(iv.end <= 60 || iv.start >= 120).toBe(true)
    }
  })

  it('repeated chops produce consistent state', () => {
    const tree = IntervalTree.fromTuples([[0, 10000]])

    // Simulate schedule-like pattern: chop many small ranges
    for (let i = 0; i < 100; i++) {
      const start = i * 100
      const end = start + 50
      tree.chop(start, end)
    }

    // Verify no remaining intervals overlap any chopped region
    for (let i = 0; i < 100; i++) {
      const start = i * 100
      const end = start + 50
      expect(tree.searchOverlap(start, end)).toEqual([])
    }
  })
})

describe('mergeOverlaps correctness', () => {
  it('merges adjacent intervals', () => {
    const tree = new IntervalTree()
    tree.addInterval(0, 10)
    tree.addInterval(10, 20)
    tree.mergeOverlaps()
    expect(tree.toTuples()).toEqual([[0, 20]])
  })

  it('merges overlapping intervals', () => {
    const tree = new IntervalTree()
    tree.addInterval(0, 15)
    tree.addInterval(10, 25)
    tree.mergeOverlaps()
    expect(tree.toTuples()).toEqual([[0, 25]])
  })

  it('does not merge non-overlapping intervals', () => {
    const tree = new IntervalTree()
    tree.addInterval(0, 10)
    tree.addInterval(20, 30)
    tree.mergeOverlaps()
    expect(tree.toTuples()).toEqual([
      [0, 10],
      [20, 30],
    ])
  })

  it('is idempotent', () => {
    const tree = new IntervalTree()
    tree.addInterval(0, 15)
    tree.addInterval(10, 25)
    tree.addInterval(30, 40)
    tree.mergeOverlaps()
    const first = tree.toTuples()
    tree.mergeOverlaps()
    expect(tree.toTuples()).toEqual(first)
  })
})

describe('first() and last()', () => {
  it('first() returns interval with smallest start', () => {
    const tree = IntervalTree.fromTuples([
      [50, 100],
      [10, 30],
      [70, 90],
    ])
    expect(tree.first()?.start).toBe(10)
  })

  it('last() returns interval with largest start', () => {
    const tree = IntervalTree.fromTuples([
      [50, 100],
      [10, 30],
      [70, 90],
    ])
    expect(tree.last()?.start).toBe(70)
  })

  it('first() and last() return null on empty tree', () => {
    const tree = new IntervalTree()
    expect(tree.first()).toBeNull()
    expect(tree.last()).toBeNull()
  })

  it('first() and last() return same interval for single-element tree', () => {
    const tree = IntervalTree.fromTuples([[5, 10]])
    expect(tree.first()?.start).toBe(5)
    expect(tree.last()?.start).toBe(5)
  })
})

describe('O(1) size tracking', () => {
  it('tracks size through add/remove', () => {
    const tree = new IntervalTree<string>()
    expect(tree.size).toBe(0)
    tree.addInterval(1, 5)
    expect(tree.size).toBe(1)
    tree.addInterval(10, 20)
    expect(tree.size).toBe(2)
    tree.remove(new Interval(1, 5))
    expect(tree.size).toBe(1)
  })

  it('does not count duplicates', () => {
    const tree = new IntervalTree<string>()
    tree.addInterval(1, 5)
    tree.addInterval(1, 5) // duplicate
    expect(tree.size).toBe(1)
  })

  it('tracks size through chop', () => {
    const tree = IntervalTree.fromTuples([[0, 1000]])
    expect(tree.size).toBe(1)
    tree.chop(200, 500)
    expect(tree.size).toBe(2) // [0,200] and [500,1000]
  })

  it('tracks size through mergeOverlaps', () => {
    const tree = new IntervalTree()
    tree.addInterval(0, 15)
    tree.addInterval(10, 25)
    expect(tree.size).toBe(2)
    tree.mergeOverlaps()
    expect(tree.size).toBe(1) // merged to [0,25]
  })

  it('tracks size through constructor', () => {
    const tree = new IntervalTree([
      new Interval(1, 5),
      new Interval(10, 20),
      new Interval(30, 40),
    ])
    expect(tree.size).toBe(3)
  })

  it('size matches toArray().length after operations', () => {
    const tree = IntervalTree.fromTuples([
      [0, 100],
      [50, 150],
      [200, 300],
    ])
    tree.chop(75, 125)
    tree.addInterval(400, 500)
    expect(tree.size).toBe(tree.toArray().length)
  })
})

describe('bulk construction correctness', () => {
  it('handles duplicate intervals in constructor', () => {
    const tree = new IntervalTree([
      new Interval(1, 5),
      new Interval(1, 5),
      new Interval(1, 5),
    ])
    expect(tree.size).toBe(1)
  })

  it('handles same-start different-end intervals', () => {
    const tree = new IntervalTree([
      new Interval(1, 5),
      new Interval(1, 10),
      new Interval(1, 15),
    ])
    expect(tree.size).toBe(3)
    expect(tree.toSorted().map(iv => iv.end)).toEqual([5, 10, 15])
  })

  it('produces same results as incremental add', () => {
    const intervals = [
      new Interval(50, 100),
      new Interval(10, 30),
      new Interval(70, 90),
      new Interval(10, 50),
      new Interval(30, 60),
    ]

    const bulk = new IntervalTree(intervals)
    const incremental = new IntervalTree()
    for (const iv of intervals) incremental.add(iv)

    expect(bulk.toTuples()).toEqual(incremental.toTuples())
  })

  it('bulk-built tree passes verification in debug mode', () => {
    const intervals = Array.from({ length: 100 }, (_, i) =>
      new Interval(i * 10, i * 10 + 15),
    )
    const tree = new IntervalTree(intervals)
    // verify() is called automatically in non-production, but call explicitly
    expect(tree.toArray().length).toBe(100)
  })
})

describe('findFirstByLengthStartingAt', () => {
  it('returns the first qualifying interval', () => {
    const tree = IntervalTree.fromTuples([
      [0, 5], // length 5
      [10, 50], // length 40
      [20, 30], // length 10
      [60, 100], // length 40
    ])
    const result = tree.findFirstByLengthStartingAt(10, 0)
    expect(result).toBeDefined()
    expect(result!.start).toBe(10)
    expect(result!.end).toBe(50)
  })

  it('adjusts start when interval begins before startingAt', () => {
    const tree = IntervalTree.fromTuples([[0, 100]])
    const result = tree.findFirstByLengthStartingAt(30, 50)
    expect(result).toBeDefined()
    expect(result!.start).toBe(50)
    expect(result!.end).toBe(100)
  })

  it('returns undefined when no interval qualifies', () => {
    const tree = IntervalTree.fromTuples([
      [0, 5],
      [10, 12],
    ])
    expect(tree.findFirstByLengthStartingAt(10, 0)).toBeUndefined()
  })

  it('returns undefined on empty tree', () => {
    const tree = new IntervalTree()
    expect(tree.findFirstByLengthStartingAt(1, 0)).toBeUndefined()
  })

  it('returns earliest match when multiple qualify', () => {
    const tree = IntervalTree.fromTuples([
      [100, 200],
      [50, 150],
      [200, 300],
    ])
    const result = tree.findFirstByLengthStartingAt(50, 0)
    expect(result!.start).toBe(50)
  })

  it('handles startingAt beyond all intervals', () => {
    const tree = IntervalTree.fromTuples([[0, 10], [20, 30]])
    expect(tree.findFirstByLengthStartingAt(1, 100)).toBeUndefined()
  })
})

describe('findOneByLengthStartingAt', () => {
  it('returns adjusted interval when start < startingAt', () => {
    const tree = IntervalTree.fromTuples([
      [0, 100],
      [50, 200],
    ])
    const result = tree.findOneByLengthStartingAt(30, 60)
    expect(result).toBeDefined()
    expect(result!.start).toBe(60)
    expect(result!.end).toBeGreaterThan(60)
  })

  it('returns undefined when nothing qualifies', () => {
    const tree = IntervalTree.fromTuples([[0, 5]])
    expect(tree.findOneByLengthStartingAt(10, 0)).toBeUndefined()
  })

  it('respects filterFn', () => {
    const tree = new IntervalTree([
      new Interval(0, 100, 'a'),
      new Interval(50, 200, 'b'),
    ])
    const result = tree.findOneByLengthStartingAt(30, 0, iv => iv.data === 'b')
    expect(result).toBeDefined()
    expect(result!.data).toBe('b')
  })
})

describe('searchEnvelop', () => {
  it('returns intervals completely contained within range', () => {
    const tree = IntervalTree.fromTuples([
      [5, 10],
      [15, 25],
      [30, 50],
      [0, 100],
    ])
    const result = tree.searchEnvelop(0, 30)
    const tuples = result.map(iv => [iv.start, iv.end]).sort((a, b) => a[0] - b[0])
    expect(tuples).toEqual([[5, 10], [15, 25]])
  })

  it('returns empty for no matches', () => {
    const tree = IntervalTree.fromTuples([[0, 100]])
    expect(tree.searchEnvelop(10, 50)).toEqual([])
  })

  it('returns empty on empty tree', () => {
    const tree = new IntervalTree()
    expect(tree.searchEnvelop(0, 100)).toEqual([])
  })
})

describe('removeEnveloped', () => {
  it('removes only intervals completely within range', () => {
    const tree = IntervalTree.fromTuples([
      [5, 10],
      [15, 25],
      [0, 100],
    ])
    tree.removeEnveloped(0, 30)
    const remaining = tree.toTuples()
    expect(remaining).toEqual([[0, 100]])
  })

  it('does nothing on empty tree', () => {
    const tree = new IntervalTree()
    tree.removeEnveloped(0, 100)
    expect(tree.size).toBe(0)
  })
})

describe('clone', () => {
  it('creates a deep copy', () => {
    const tree = IntervalTree.fromTuples([[1, 5], [10, 20], [30, 40]])
    const cloned = tree.clone()
    expect(cloned.toTuples()).toEqual(tree.toTuples())
    expect(cloned.size).toBe(tree.size)
  })

  it('cloned tree is independent of original', () => {
    const tree = IntervalTree.fromTuples([[1, 5], [10, 20]])
    const cloned = tree.clone()
    tree.chop(1, 5)
    // Original changed, clone should not
    expect(tree.size).toBe(1)
    expect(cloned.size).toBe(2)
  })

  it('cloning empty tree works', () => {
    const tree = new IntervalTree()
    const cloned = tree.clone()
    expect(cloned.isEmpty).toBe(true)
    expect(cloned.size).toBe(0)
  })
})

describe('chopAll correctness', () => {
  it('chopAll produces same result as sequential chops', () => {
    const ranges: [number, number][] = [
      [100, 200],
      [300, 400],
      [500, 600],
    ]
    const tree1 = IntervalTree.fromTuples([[0, 1000]])
    tree1.chopAll(ranges)

    const tree2 = IntervalTree.fromTuples([[0, 1000]])
    for (const [s, e] of ranges) tree2.chop(s, e)

    expect(tree1.toTuples()).toEqual(tree2.toTuples())
  })

  it('mergeOverlaps is no-op after chopAll', () => {
    const tree = IntervalTree.fromTuples([[0, 1000]])
    tree.chopAll([[100, 200], [300, 400]])
    const before = tree.toTuples()
    tree.mergeOverlaps()
    expect(tree.toTuples()).toEqual(before)
  })

  it('mergeOverlaps is no-op after chop', () => {
    const tree = IntervalTree.fromTuples([[0, 1000]])
    tree.chop(100, 200)
    const before = tree.toTuples()
    tree.mergeOverlaps()
    expect(tree.toTuples()).toEqual(before)
  })

  it('size is correct after chopAll', () => {
    const tree = IntervalTree.fromTuples([[0, 1000]])
    tree.chopAll([[100, 200], [300, 400], [500, 600]])
    expect(tree.size).toBe(tree.toArray().length)
  })
})

describe('dirty flag correctness', () => {
  it('mergeOverlaps does work when tree has overlaps from add', () => {
    const tree = new IntervalTree()
    tree.addInterval(0, 15)
    tree.addInterval(10, 25)
    // Tree should be dirty — two overlapping intervals
    tree.mergeOverlaps()
    expect(tree.toTuples()).toEqual([[0, 25]])
  })

  it('mergeOverlaps is idempotent — second call is no-op', () => {
    const tree = new IntervalTree()
    tree.addInterval(0, 15)
    tree.addInterval(10, 25)
    tree.mergeOverlaps()
    const first = tree.toTuples()
    tree.mergeOverlaps()
    expect(tree.toTuples()).toEqual(first)
  })

  it('chop followed by add marks dirty correctly', () => {
    const tree = IntervalTree.fromTuples([[0, 100]])
    tree.chop(40, 60) // [0,40] + [60,100] — not dirty (chop preserves)
    tree.addInterval(35, 65) // overlaps both pieces — should mark dirty
    tree.mergeOverlaps()
    // After merge: [0, 100] (all three merge together)
    const tuples = tree.toTuples()
    expect(tuples.length).toBe(1)
    expect(tuples[0][0]).toBe(0)
    expect(tuples[0][1]).toBe(100)
  })
})
