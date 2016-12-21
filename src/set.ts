import { Interval } from './Interval'
import { SortedSet } from 'collections/sorted-set'


/* comparison interface for collectionsjs */
function equals(a: Interval, b: Interval) {
  return (a.start === b.start) && (a.end === b.end)
}


export function compareByInterval(a: Interval, b: Interval) {
  // compare so that it first compares using start then end
  if (a.start < b.start) {
    return -1
  } else if (a.start > b.start) {
    return 1
  } else {
    if (a.end < b.end) {
      return -1
    } else if (a.end > b.end) {
      return 1
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
