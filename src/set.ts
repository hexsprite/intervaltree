import { Interval } from './Interval'
import { SortedSet } from 'collections/sorted-set'

export class IntervalSet extends SortedSet<Interval> {
  public constructor(intervals:any=[Interval]) {
    super(intervals, Interval.equals, Interval.compare)
  }
}
