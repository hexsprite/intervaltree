import { HashSet, Hasher, SortedSet } from '@rimbu/core'
import { Interval } from './Interval'

/**
 * A HashSet of Intervals.
 */
export const IntervalHashSet = HashSet.createContext<Interval>({
  hasher: Hasher.anyDeepHasher(), // deep so it should also hash the data part
})

export const compareIntervals = (a: Interval, b: Interval) => {
  return (
    a.start - b.start ||
    a.end - b.end ||
    compareString((a.data as string) ?? '', (b.data as string) ?? '')
  )
}

/**
 * A SortedSet of Intervals.
 */
export const IntervalSortedSet = SortedSet.createContext<Interval>({
  comp: {
    compare: compareIntervals,
    isComparable(obj): obj is Interval {
      return obj instanceof Interval
    },
  },
})

function compareString(a: string, b: string) {
  return a < b ? -1 : a > b ? 1 : 0
}
