import { SortedSet } from '@rimbu/core'
import { Interval } from './Interval'

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
export const IntervalSet = SortedSet.createContext<Interval>({
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
