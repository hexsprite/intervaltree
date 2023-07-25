import { SortedSet } from '@rimbu/sorted/set'
import { Interval } from './Interval'

export const IntervalSet = SortedSet.createContext<Interval>({
  comp: {
    compare: (a, b) => {
      return (
        a.start - b.start ||
        a.end - b.end ||
        compareString((a.data as string) ?? '', (b.data as string) ?? '')
      )
    },
    isComparable(obj): obj is Interval {
      return obj instanceof Interval
    },
  },
})

function compareString(a: string, b: string) {
  return a < b ? -1 : a > b ? 1 : 0
}
