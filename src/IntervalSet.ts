import { SortedSet } from 'collections/sorted-set'
import * as lodash from 'lodash'
import { Interval } from './Interval'

function equals(a: Interval, b: Interval): boolean {
  return (
    a.start === b.start && a.end === b.end && lodash.isEqual(a.data, b.data)
  )
}

export function compareByInterval(a: Interval, b: Interval): number {
  for (const key of ['start', 'end', 'data']) {
    const av = a[key] || '' // solve problems with undefined values
    const bv = b[key] || '' // ""
    let result = Object.compare(av, bv)
    if (key === 'data' && result === 0 && av !== bv) {
      if (av < bv) {
        result = -1
      } else {
        result = 1
      }
    }
    if (result !== 0) {
      return result
    }
  }
  return 0
}

export default class IntervalSet extends SortedSet<Interval> {
  public constructor(intervals?: IntervalSet | Interval[] | null) {
    super(intervals, equals, compareByInterval)
  }
}
