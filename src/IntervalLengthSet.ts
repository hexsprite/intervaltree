import { Interval } from './Interval'

export default class IntervalLengthSet extends SortedSet<Interval> {
  private static contentEquals(left: Interval, right: Interval): boolean {
    // console.log('IntervalLengthSet contentEquals:', left, right)
    return left.start === right.start && left.end === right.end
  }

  private static contentCompare(left: Interval, right: Interval): number {
    const length = (iv: Interval) => iv.end - iv.start
    if (length(left) < length(right)) {
      return -1
    } else if (length(left) > length(right)) {
      return 1
    }
    if (left.start < right.start) {
      return -1
    }
    if (left.start > right.start) {
      return 1
    }
    return 0
  }

  constructor(...args: any[]) {
    super(
      ...args,
      IntervalLengthSet.contentEquals,
      IntervalLengthSet.contentCompare
    )
  }
}
