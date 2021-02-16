import SplayTree from 'splaytree';
import { Interval } from './Interval'

export default class IntervalSet extends SplayTree<Interval> {
    constructor(comparator = undefined) {
        super(comparator)
    }
}
