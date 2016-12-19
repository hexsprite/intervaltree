let SortedSet = require('collections/sorted-set')
import { Interval } from './Interval'

export class IntervalSet extends SortedSet {
  public constructor(intervals:any) {
    super(intervals, Interval.equals, Interval.compare)
  }
}
