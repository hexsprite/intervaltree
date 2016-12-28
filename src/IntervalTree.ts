let assert = require('assert')
let SortedMap = require('collections/sorted-map')
let SortedSet = require('collections/sorted-set')
let range = require('lodash.range')
const crypto = require('crypto')

import { bisectLeft } from './bisect'
import { debug } from './debug'
import { Node } from './Node'
import { Interval } from './Interval'
import { IntervalSet, IntervalLengthSet, compareByInterval } from './set'

export class IntervalTree {
  public allIntervals: IntervalSet
  public allIntervalsByLength: IntervalLengthSet
  private topNode: Node
  private boundaryTable: SortedMap

  public constructor(intervals:Array<Interval> = []) {
    this.__init(intervals)
  }

  public initFromArray(intervals: Array<Interval>) {
    this.__init(intervals)
  }

  public initFromSimpleArray(intervals: Array<Array<number>>) {
    this.initFromArray(intervals.map(x => new Interval(x[0], x[1])))
  }

  public toJSON() {
    return this.allIntervals.toArray()
  }

  public static fromJSON(nodes:any) {
    const intervals = []
    if (typeof nodes === 'string')
      nodes = JSON.parse(nodes)
    for (const node of nodes) {
      intervals.push(new Interval(node.start, node.end, node.data))
    }
    return new IntervalTree(intervals)
  }

  public hash() {
    const hash = crypto.createHash('md5')
    hash.update(JSON.stringify(this))
    return hash.digest('hex')
  }

  private __init(intervals:any) {
    this.allIntervals = new IntervalSet().addEach(intervals)
    this.allIntervalsByLength = new IntervalLengthSet([]).addEach(intervals)
    this.topNode = Node.fromIntervals(intervals)
    this.boundaryTable = SortedMap()
    for (let iv of intervals) {
      this.addBoundaries(iv)
    }
  }

  public add(interval: Interval) {
    //debug('tree/add', interval)
    if (this.allIntervals.has(interval)) {
      return
    }
    if (interval.isNull()) {
      throw new TypeError(`null Interval objects not allowed in IntervalTree: ${interval}`)
    }
    if (!this.topNode) {
      this.topNode = Node.fromInterval(interval)
    } else {
      this.topNode = this.topNode.add(interval)
    }
    this.allIntervals.add(interval)
    this.allIntervalsByLength.add(interval)
    this.addBoundaries(interval)
  }

  public addInterval(start: number, end: number, data?: any) {
    let interval = new Interval(start, end, data)
    return this.add(interval)
  }

  public chop(start: number, end: number) {
    // Like removeEnveloped(), but trims back Intervals hanging into
    // the chopped area so that nothing overlaps.
    const insertions = new IntervalSet()
    const startHits = this.search(start).filter((iv) => iv.start < start)
    const endHits = this.search(end).filter((iv) => iv.end > end)
    startHits.forEach((iv) => {
      insertions.add(new Interval(iv.start, start, iv.data))
    })
    endHits.forEach((iv) => {
      insertions.add(new Interval(end, iv.end, iv.data))
    })
    debug(() => `chop: start=${start} end=${end} insertions=${insertions.toArray()} startHits=${startHits.toArray()} endHits=${endHits.toArray()}`)
    debug(() => `chop: before=${this.allIntervals.toArray()}`)
    this.removeEnveloped(start, end)
    this.differenceUpdate(startHits)
    this.differenceUpdate(endHits)
    this.update(insertions)
    debug(() => `chop: after=${this.allIntervals.toArray()}`)
  }

  public update(intervals: IntervalSet) {
    /*
    Given an iterable of intervals, add them to the tree.

    Completes in O(m*log(n+m), where m = number of intervals to
    add.
    */
    intervals.forEach(iv => {
      this.add(iv)
    })
  }

  public differenceUpdate(other: IntervalSet) {
    other.forEach(iv => {
      this.discard(iv)
    })
  }

  public discard(interval: Interval) {
    /*
    Removes an interval from the tree, if present. If not, does
    nothing.

    Completes in O(log n) time.
    */
    return this.remove(interval, true)
  }

  public remove(interval: Interval, ignoreMissing=false) {
    /*
    Removes an interval from the tree, if present. If not, raises
    TypeError.

    Completes in O(log n) time.
    */
    //debug('remove', interval)
    if (!this.allIntervals.has(interval)) {
      if (ignoreMissing)
        return
      throw new RangeError('no such interval')
    }
    this.topNode = this.topNode.remove(interval)
    this.allIntervals.delete(interval)
    this.allIntervalsByLength.remove(interval)
    this.removeBoundaries(interval)
  }

  public removeEnveloped(start:number, end:number) {
    /*
    Removes all intervals completely enveloped in the given range.

    Completes in O((r+m)*log n) time, where:
      * n = size of the tree
      * m = number of matches
      * r = size of the search range (this is 1 for a point)
    */
    //debug(`removeEnveloped: start=${start} end=${end}`)
    let hitlist = this.search(start, end, true)
    hitlist.forEach(iv => {
      //debug('removing', iv)
      this.remove(iv)
    })
  }

  public toString() {
    return `IntervalTree([${this.allIntervals.toArray().toString()}])`
  }

  public printStructure() {
    if (this.topNode) {
      this.topNode.printStructure()
    }
  }

  public printForTests() {
    let arr = this.allIntervals.toArray()
    arr.forEach((iv) => {
      console.log(`[${iv.start}, ${iv.end}],`)
    })
  }

  public mergeOverlaps() {
    const merged:[Interval] = [] as [Interval]
    let currentReduced:[number|null] = [null]

    let newSeries = (higher:Interval) => {
      currentReduced[0] = higher.data
      merged.push(higher)
    }

    this.allIntervals.forEach(higher => {
      //debug('mergeOverlaps: higher', higher)
      if (merged.length) {  // series already begun
        const lower = merged[merged.length - 1]
        if (higher.start <= lower.end) { // should merge
          const upperBound = Math.max(lower.end, higher.end)
          currentReduced[0] = null
          merged[merged.length - 1] = new Interval(lower.start, upperBound,
            currentReduced[0])
        } else {
          newSeries(higher)
        }
      } else {
        newSeries(higher)
      }
    })

    this.__init(merged)
  }

  public end() {
    if (!this.boundaryTable.length) {
      return 0
    }
    const iloc = this.boundaryTable.keysArray() // FIXME: slow?
    return iloc[iloc.length - 1]
  }

  public start() {
    if (!this.boundaryTable.length) {
      return 0
    }
    const iloc = this.boundaryTable.keysArray() // FIXME: slow?
    return iloc[0]
  }

  public first() {
    if (!this.allIntervals.length) {
      return null
    }
    let result = this.allIntervals.iterator().next().value
    return result
  }

  public last() {
    if (!this.allIntervals.length) {
      return null
    }
    let intervals = this.allIntervals.toArray()
    let result = intervals[intervals.length - 1]
    //debug(`last: result=${result}`)
    return result
  }

  public addBoundaries(interval: Interval) {
    const { start, end } = interval
    const addBoundary = (point: number) => {
      if (this.boundaryTable.has(point)) {
        this.boundaryTable.set(point, this.boundaryTable.get(point) + 1)
      } else {
        this.boundaryTable.set(point, 1)
      }    
    }
    addBoundary(start)
    addBoundary(end)
  }

  public removeBoundaries(interval: Interval) {
    // Removes the boundaries of the interval from the boundary table.
    const updateValue = (key:number) => {
      const boundaryTable = this.boundaryTable
      if (boundaryTable.get(key) === 1)
        boundaryTable.delete(key)
      else
        boundaryTable.set(key, boundaryTable.get(key) - 1)
    }
    updateValue(interval.start)
    updateValue(interval.end)
  }

  public slice(start:number|null, stop:number|null):IntervalSet {
    if (start === null) {
      start = this.start()
      if (stop === null) {
        return this.allIntervals
      }
    }
    if (stop === null) {
      stop = this.end()
    }
    return this.search(start, stop)
  }

  public search(start:number, end:number|null=null, strict=false):IntervalSet {
    /*
     Returns a set of all intervals overlapping the given range.
     Or, if strict is true, returns the set of all intervals fully
     contained in the range [begin, end].
     Completes in O(m + k*log n) time, where:
       * n = size of the tree
       * m = number of matches
       * k = size of the search range (this is 1 for a point)
     :rtype: set of Interval
    */
    if (!this.topNode) {
      return new IntervalSet()
    }
    if (end === null) {
      return this.topNode.searchPoint(start, new IntervalSet())
    }
    let result = this.topNode.searchPoint(start, new IntervalSet())
    let keysArray = this.boundaryTable.keysArray()
    let boundStart = bisectLeft(keysArray, start)
    let boundEnd = bisectLeft(keysArray, end)  // exclude final end bound
    debug(() => `search: start=${start} end=${end} strict=${strict} boundaryTable=${keysArray}`)
    debug(() => `search: boundStart=${boundStart} boundEnd=${boundEnd}`)
    result.addEach(this.topNode.searchOverlap(
      range(boundStart, boundEnd).map(index => keysArray[index])
    ))

    // TODO: improve strict search to use node info instead of less-efficient filtering
    if (strict) {
      result = result.filter(iv => iv.start >= start && iv.end <= end)
    }
    debug(() => 'search: result=', result.toArray())
    return result
  }

  public searchByLengthStartingAt(length: number, start:number):Array {
    // filter by length
    let result = this.allIntervalsByLength.findLeastGreaterThan(
      Interval.fromLength(length))
    let idx = this.allIntervalsByLength.indexOf(result.value)

    // filter by start
    let is = this.allIntervalsByLength.slice(idx)
    let byStart = new IntervalSet(is)
    result = byStart.findLeastGreaterThanOrEqual(new Interval(start, start))
    idx = byStart.indexOf(result.value)
    return byStart.slice(idx)
  }
  
  public clone():IntervalTree {
    /*
    Construct a new IntervalTree using shallow copies of the 
    intervals in the source tree.
    
    Completes in O(n*log n) time.
    */
    return new IntervalTree(this.allIntervals.toArray())
    // PERF: should be possible to use .clone() and pass directly? Faster?
  }

  public verify(parents=new IntervalSet()) {
    /*
    DEBUG ONLY
    Checks the table to ensure that the invariants are held.
    */
    if (this.allIntervals.length) {
      assert(this.topNode.allChildren().equals(this.allIntervals), 
        'Error: the tree and the membership set are out of sync!')

      // No null intervals
      this.allIntervals.forEach((iv) => {
        assert(!iv.isNull(),
          "null Interval objects not allowed in IntervalTree")
      })

      // Reconstruct boundaryTable
      let boundaryCheck = SortedMap()
      this.allIntervals.forEach((iv) => {
        if (boundaryCheck.has(iv.start)) {
          boundaryCheck.set(iv.start, boundaryCheck.get(iv.start) + 1)
        } else {
          boundaryCheck.set(iv.start, 1)
        }
        if (boundaryCheck.has(iv.end)) {
          boundaryCheck.set(iv.end, boundaryCheck.get(iv.end) + 1)
        } else {
          boundaryCheck.set(iv.end, 1)
        }
      })

      // Reconstructed boundary table (bound_check) ==? boundary_table
      assert(this.boundaryTable.equals(boundaryCheck),
       'boundaryTable is out of sync with the intervals in the tree')

      // Internal tree structure
      this.topNode.verify(new SortedSet([]))
    } else {
      // Verify empty tree
      assert(!this.boundaryTable.length, 
        'boundary table should be empty')
      assert(!this.topNode, 'topNode isn\'t None')
    }
  }
}
