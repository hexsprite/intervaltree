import { SortedSet } from '@rimbu/sorted'
import { Interval } from './Interval'

export const IntervalSet = SortedSet.createContext<Interval>({
  comp: {
    compare: (a, b) => {
      return (
        compare(a.start, b.start) ||
        compare(a.end, b.end) ||
        compare((a.data as string) || '', (b.data as string) || '')
      )
    },
    isComparable(obj): obj is Interval {
      return obj instanceof Interval
    },
  },
})

function compare(a: string | number, b: string | number) {
  if (typeof a === 'number' && typeof b === 'number') {
    return a - b
  }
  if (typeof a === 'string' && typeof b === 'string') {
    return a.localeCompare(b)
  }
}
