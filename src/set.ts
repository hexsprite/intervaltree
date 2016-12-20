import { Interval } from './Interval'
import { SortedSet } from 'collections/sorted-set'

export class IntervalSet extends SortedSet<Interval> {
  public constructor(intervals?:(IntervalSet|Interval[])) {
    super([], Interval.equals, Interval.compare)
  }
}
