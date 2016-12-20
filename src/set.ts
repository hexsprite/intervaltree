import { Interval } from './Interval'
import { SortedSet } from 'collections/sorted-set'

export class IntervalSet extends SortedSet<Interval> {
  public constructor(intervals?:(IntervalSet|[Interval]|null)) {
    super(intervals, Interval.equals, Interval.compare)
  }
}
