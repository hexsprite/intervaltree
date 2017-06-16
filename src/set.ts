import { Interval } from './Interval'
import { SortedSet } from 'collections/sorted-set'
import * as lodash from 'lodash'

/* comparison interface for collectionsjs */
function equals(a: Interval, b: Interval) {
  return ((a.start === b.start) && (a.end === b.end) &&
    lodash.isEqual(a.data, b.data))
}


export function compareByInterval(a: Interval, b: Interval) {
  for (const key of ['start', 'end', 'data']) {
    const av = a[key] || ''  // solve problems with undefined values
    const bv = b[key] || ''  // ""
    let result = Object.compare(av, bv)
    if (key === 'data' && result === 0 && av !== bv) {
      if (av < bv)
        result = -1
      else
        result = 1
    }
    if (result !== 0) {
      return result
    }
  }
  return 0
}


export class IntervalSet extends SortedSet<Interval> {
  public constructor(intervals?:(IntervalSet|[Interval]|null)) {
    super(intervals, equals, compareByInterval)
  }
}


export class IntervalLengthSet extends SortedSet<Interval> {
  constructor(...args:any) {
    return super(...args, IntervalLengthSet.contentEquals, IntervalLengthSet.contentCompare)
  }

  static contentEquals(left:Interval, right:Interval) {
    // console.log('IntervalLengthSet contentEquals:', left, right)
    return (left.start === right.start) && (left.end === right.end)
  }

  static contentCompare(left: Interval, right:Interval) {
    const length = (iv:Interval) => iv.end - iv.start
    //console.log('IntervalLengthSet contentCompare:', left, right)
    if (length(left) < length(right))
      return -1
    else if (length(left) > length(right))
      return 1
    if (left.start < right.start)
      return -1
    if (left.start > right.start)
      return 1
    return 0
  }
}
