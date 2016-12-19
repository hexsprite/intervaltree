let SortedMap = require('collections/sorted-map')

import { Node } from './Node'
import { Interval } from './Interval'
import { IntervalSet } from './set'
import { ValueError } from './error'

export class IntervalTree {
  public allIntervals: IntervalSet
  private topNode: Node
  private boundaryTable: any

  public constructor(intervals:any = []) {
    this.__init(intervals)
  }

  private __init(intervals:any) {
    this.allIntervals = new IntervalSet(intervals)
    this.topNode = Node.fromIntervals(intervals)
    this.boundaryTable = SortedMap()
    for (let iv of intervals) {
      this.addBoundaries(iv)
    }
  }

  public add(interval: Interval) {
    if (this.allIntervals.has(interval)) {
      return
    }

    if (interval.isNull()) {
      throw new ValueError(`IntervalTree: Null Interval objects not allowed in IntervalTree: ${interval}`)
    }

    if (!this.topNode) {
      this.topNode = Node.fromInterval(interval)
    } else {
      this.topNode = this.topNode.add(interval)
    }

    this.allIntervals.add(interval)
    this.addBoundaries(interval)
  }

  public addInterval(start: number, end: number, data: any) {
    let interval = new Interval(start, end, data)
    return this.add(interval)
  }

  public chop(start: number, end: number) {
    // Like removeEnveloped(), but trims back Intervals hanging into
    // the chopped area so that nothing overlaps.
    console.log('chop', start, end)
    const insertions = new IntervalSet()
    const startHits = this.search(start, this.end()) //.filter(iv.begin < begin)
    const endHits = this.search(end, this.end()) //.filter(iv.end > end)
    console.log(`chop: startHits=${startHits.toArray()} endHits=${endHits.toArray()}`)
    for (const iv of startHits.toArray()) {
      insertions.add(new Interval(iv.start, start, iv.data))
    }
    for (const iv of endHits.toArray()) {
      insertions.add(new Interval(end, iv.end, iv.data))
    }
    console.log(`chop: insertsions=${insertions.toArray().toString()}`)
    this.removeEnveloped(start, end)
    this.differenceUpdate(startHits)
    this.differenceUpdate(endHits)
    this.update(insertions)
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
    ValueError.

    Completes in O(log n) time.
    */
    if (!this.allIntervals.has(interval)) {
      if (ignoreMissing)
        return
      throw new ValueError('dont exist buddy')
    }
    this.topNode = this.topNode.remove(interval)
    this.allIntervals.delete(interval)
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
    let hitlist = this.search(start, end, true)
    hitlist.forEach(iv => {
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

  public mergeOverlaps() {
    const merged:[Interval] = [] as [Interval]
    let currentReduced:[number|null] = [null]
    let higher:Interval

    let newSeries = () => {
      currentReduced[0] = higher.data
      merged.push(higher)
    }

    for (higher of this.allIntervals.toArray()) {
      console.log('higher', higher)
      if (merged.length) {  // series already begun
        const lower = merged[merged.length - 1]
        if (higher.start <= lower.end) { // should merge
          const upperBound = Math.max(lower.end, higher.end)
          currentReduced[0] = null
          merged[merged.length - 1] = new Interval(lower.start, upperBound,
            currentReduced[0])
        } else {
          newSeries()
        }
      } else {
        newSeries()
      }
    }
    console.log('merged', merged)
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
    // let result = this.allIntervals.get(0)
    console.log(`first: result=${result}`)
    console.dir(result)
    return result
  }

  public last() {
    if (!this.allIntervals.length) {
      return null
    }
    let intervals = this.allIntervals.toArray()
    let result = intervals[intervals.length - 1]
    // let result = this.allIntervals.get(0)
    console.log(`last: result=${result}`)
    console.dir(result)
    return result
  }

  public addBoundaries(interval: Interval) {
    const { start, end } = interval
    if (this.boundaryTable.has(start)) {
      this.boundaryTable.set(start, this.boundaryTable.get(start) + 1)
    } else {
      this.boundaryTable.set(start, 1)
    }
    if (this.boundaryTable.has(end)) {
      this.boundaryTable.set(end, this.boundaryTable.get(end) + 1)
    } else {
      this.boundaryTable.set(end, 1)
    }
  }

  public removeBoundaries(interval: Interval) {
    // Removes the boundaries of the interval from the boundary table.
    const updateValue = key => {
      const boundaryTable = this.boundaryTable
      if (boundaryTable.get(key) == 1)
        boundaryTable.delete(key)
      else
        boundaryTable.set(key, boundaryTable.get(key) - 1)
    }
    const { start, end } = interval
    updateValue(start)
    updateValue(end)
  }

  public search(start:number, end:number, strict=false):IntervalSet {
    /*
    Returns a set of all intervals overlapping the given range. Or,
     if strict is true, returns the set of all intervals fully
     contained in the range [begin, end].
     Completes in O(m + k*log n) time, where:
       * n = size of the tree
       * m = number of matches
       * k = size of the search range (this is 1 for a point)
     :rtype: set of Interval
    */
    console.log(`search: start=${start} end=${end} strict=${strict}`)
    let root = this.topNode
    if (!root) {
      return new IntervalSet()
    }
    let result = root.searchPoint(start, new IntervalSet())
    console.log(`search top: result=${result.toArray()}`, result)
    let boundaryTable = this.boundaryTable
    let bisectLeft = (obj:IntervalSet, key:any) => {
      let keys = obj.keysArray()
      console.log(`bisectLeft: key=${key} keys=${keys}`)
      return keys.indexOf(key)
    }
    let boundStart = bisectLeft(boundaryTable, start)
    let boundEnd = bisectLeft(boundaryTable, end)  // exclude final end bound
    console.log(`search: boundStart=${boundStart} boundEnd=${boundEnd}`)
    let boundaryArray = boundaryTable.toArray()
    let boundIndexes = Array.from(Array(boundEnd - boundStart), (_, i) => boundStart + i)
    result.addEach(root.searchOverlap(
      boundIndexes.map(index => boundaryArray[index])
    ))

    // TODO: improve strict search to use node info instead of less-efficient filtering
    if (strict) {
      console.log('result before', result)
      result = new IntervalSet(
        result.toArray().filter(iv => iv.start >= start && iv.end <= end)
      )
    }
    console.log('search: result=', result, result.toArray())
    return result
  }

  public searchByLength(length: number) {
    return this.allIntervals.filter((interval:Interval) => (interval.end - interval.start) >= length)
  }
}
