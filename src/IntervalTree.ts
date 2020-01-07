import * as SortedMap from 'collections/sorted-map'
import * as assert from 'assert'
import * as crypto from 'crypto'
import * as lodash from 'lodash'
import * as range from 'lodash.range'

import { bisectLeft } from './bisect'
import { debug } from './debug'
import { Node } from './Node'
import { Interval } from './Interval'
import IntervalSet from './IntervalSet'
import { SortedSet } from 'collections/sorted-set'

export type SimpleIntervalArray = Array<
  [number, number, any] | [number, number]
>

export class IntervalTree {
  public static fromJSON(nodes: any) {
    const intervals = []
    if (typeof nodes === 'string') {
      nodes = JSON.parse(nodes)
    }
    for (const node of nodes) {
      intervals.push(new Interval(node.start, node.end, node.data))
    }
    return new IntervalTree(intervals)
  }

  public allIntervals: IntervalSet
  private topNode: Node
  private boundaryTable: SortedMap

  public constructor(intervals: Interval[] = []) {
    this.__init(intervals)
  }

  public initFromArray(intervals: Interval[]) {
    this.__init(intervals)
  }

  public initFromSimpleArray(intervals: SimpleIntervalArray) {
    this.initFromArray(intervals.map(x => new Interval(x[0], x[1], x[2])))
  }

  public toArray() {
    return this.allIntervals.map(e => [e.start, e.end, e.data])
  }

  public toJSON() {
    return this.allIntervals.toArray()
  }

  public hash() {
    const hash = crypto.createHash('md5')
    hash.update(JSON.stringify(this))
    return hash.digest('hex')
  }

  public add(interval: Interval) {
    // debug('tree/add', interval)
    if (this.allIntervals.has(interval)) {
      return
    }
    if (interval.isNull()) {
      throw new TypeError(`null Interval in IntervalTree: ${interval}`)
    }
    if (!this.topNode) {
      this.topNode = Node.fromInterval(interval)
    } else {
      this.topNode = this.topNode.add(interval)
    }
    this.allIntervals.add(interval)
    this.addBoundaries(interval)
  }

  public addInterval(start: number, end: number, data?: any) {
    const interval = new Interval(start, end, data)
    return this.add(interval)
  }

  /**
   * Like removeEnveloped(), but trims back Intervals hanging into the chopped
   * area so that nothing overlaps.
   * @param start
   * @param end
   */
  public chop(start: number, end: number) {
    if (start > end) {
      throw TypeError('invalid parameters to chop')
    }
    const insertions = new IntervalSet()
    const startHits = this.search(start).filter(iv => iv.start < start)
    const endHits = this.search(end).filter(iv => iv.end > end)
    startHits.forEach(iv => {
      insertions.add(new Interval(iv.start, start, iv.data))
    })
    endHits.forEach(iv => {
      insertions.add(new Interval(end, iv.end, iv.data))
    })
    debug(() => ({
      end,
      endHits: endHits.toArray(),
      insertions: insertions.toArray(),
      start,
      startHits: startHits.toArray()
    }))
    debug(() => `chop: before=${this.allIntervals.toArray()}`)
    this.removeEnveloped(start, end)
    this.differenceUpdate(startHits)
    this.differenceUpdate(endHits)
    this.update(insertions)
    debug(() => `chop: after=${this.allIntervals.toArray()}`)
  }

  /**
   * Given an iterable of intervals, add them to the tree.
   * Completes in O(m*log(n+m)), where m = number of intervals to add.
   */
  public update(intervals: IntervalSet) {
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

  public remove(interval: Interval, ignoreMissing = false) {
    /*
    Removes an interval from the tree, if present. If not, raises
    RangeError.

    Completes in O(log n) time.
    */
    // debug('remove', interval)
    if (!this.allIntervals.has(interval)) {
      if (ignoreMissing) {
        return
      }
      throw new RangeError(`no such interval: ${interval}`)
    }
    this.topNode = this.topNode.remove(interval)
    this.allIntervals.delete(interval)
    this.removeBoundaries(interval)
  }

  public removeEnveloped(start: number, end: number) {
    /*
    Removes all intervals completely enveloped in the given range.

    Completes in O((r+m)*log n) time, where:
      * n = size of the tree
      * m = number of matches
      * r = size of the search range (this is 1 for a point)
    */
    debug(`removeEnveloped: start=${start} end=${end}`)
    const hitlist = this.search(start, end, true)
    hitlist.forEach(iv => {
      debug('removing', iv)
      try {
        this.remove(iv)
      } catch (err) {
        if (err.constructor === RangeError) {
          err.message += `
removeEnveloped(${start}, ${end})
allIntervals=${this.allIntervals.toArray()}
hitlist=${hitlist.toArray()}
badInterval=${iv}
`
          // rethrow error now that we added more debug info
          throw err
        }
      }
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
    this.allIntervals.toArray().forEach(iv => {
      // tslint:disable-next-line no-console
      console.log(`[${iv.start}, ${iv.end}, ${iv.data}],`)
    })
  }

  public mergeOverlaps() {
    const merged: Interval[] = []
    let currentReduced: string

    const newSeries = (higher: Interval) => {
      currentReduced = higher.data
      merged.push(higher)
    }

    this.allIntervals.forEach(higher => {
      if (merged.length) {
        // series already begun
        const lower = merged[merged.length - 1]
        assert(higher.start)
        if (higher.start <= lower.end) {
          // should merge
          const upperBound = Math.max(lower.end, higher.end)
          currentReduced = null
          merged[merged.length - 1] = new Interval(
            lower.start,
            upperBound,
            currentReduced
          )
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
    return this.allIntervals.iterator().next().value
  }

  public last() {
    if (!this.allIntervals.length) {
      return null
    }
    const intervals = this.allIntervals.toArray()
    return intervals[intervals.length - 1]
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
    const updateValue = (key: number) => {
      const boundaryTable = this.boundaryTable
      if (boundaryTable.get(key) === 1) {
        boundaryTable.delete(key)
      } else {
        boundaryTable.set(key, boundaryTable.get(key) - 1)
      }
    }
    updateValue(interval.start)
    updateValue(interval.end)
  }

  public slice(start: number | null, stop: number | null): IntervalSet {
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

  /**
   * Returns a set of all intervals overlapping the given range.
   * Or, if strict is true, returns the set of all intervals fully contained in
   * the range [start, end].
   * Completes in O(m + k*log n) time, where:
   *   * n = size of the tree
   *   * m = number of matches
   *   * k = size of the search range (this is 1 for a point)
   **/
  public search(
    start: number,
    end: number | null = null,
    strict = false
  ): IntervalSet {
    if (!this.topNode) {
      return new IntervalSet()
    }
    if (end === null) {
      return this.topNode.searchPoint(start, new IntervalSet())
    }
    let result = this.topNode.searchPoint(start, new IntervalSet())
    const keysArray = this.boundaryTable.keysArray()
    const boundStart = bisectLeft(keysArray, start)
    const boundEnd = bisectLeft(keysArray, end) // exclude final end bound
    debug(
      () =>
        `search: start=${start} end=${end} strict=${strict} boundaryTable=${keysArray}`
    )
    debug(() => `search: boundStart=${boundStart} boundEnd=${boundEnd}`)
    result.addEach(
      this.topNode.searchOverlap(
        range(boundStart, boundEnd).map(index => keysArray[index])
      )
    )

    // TODO: improve strict search to use node info instead of less-efficient filtering
    if (strict) {
      result = result.filter(iv => iv.start >= start && iv.end <= end)
    }
    debug(() => 'search: result=', result.toArray())
    return result
  }

  public searchByLengthStartingAt(length: number, start: number): Interval[] {
    // find all intervals that overlap start
    // adjust nodes to match the start time
    let intervals: Interval[] = this.search(start, Infinity).map(iv => {
      // return a new node with changed start time if necessary
      if (iv.start < start) {
        return new Interval(start, iv.end, iv.data)
      }
      return iv
    })

    // now filter by duration
    // console.log('by duration', intervals.toArray())
    // console.log('desired length', length)
    intervals = intervals.filter(iv => iv.length >= length)
    // console.log('after duration', intervals.toArray())
    return intervals
  }

  public clone(): IntervalTree {
    /*
    Construct a new IntervalTree using shallow copies of the
    intervals in the source tree.

    Completes in O(n*log n) time.
    */
    const tree = new IntervalTree()
    tree.topNode = this.topNode.clone()
    tree.boundaryTable = this.boundaryTable.clone(1)
    tree.allIntervals = new IntervalSet(this.allIntervals)
    return tree
  }

  public verify() {
    /*
    DEBUG ONLY
    Checks the table to ensure that the invariants are held.
    */
    if (this.allIntervals.length) {
      assert(
        lodash.isEqual(
          this.topNode.allChildren().toArray(),
          this.allIntervals.toArray()
        ),
        `Error: the tree and the membership set are out of sync! \
fromNodes=${this.topNode.allChildren().toArray()} \
allIntervals=${this.allIntervals.toArray()}`
      )

      // No null intervals
      this.allIntervals.forEach(iv => {
        assert(
          !iv.isNull(),
          'null Interval objects not allowed in IntervalTree'
        )
      })

      // Reconstruct boundaryTable
      const boundaryCheck = SortedMap()
      this.allIntervals.forEach(iv => {
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
      assert(
        this.boundaryTable.equals(boundaryCheck),
        'boundaryTable is out of sync with the intervals in the tree'
      )

      // Internal tree structure
      this.topNode.verify()
    } else {
      // Verify empty tree
      assert(!this.boundaryTable.length, 'boundary table should be empty')
      assert(!this.topNode, "topNode isn't None")
    }
  }

  private __init(intervals: any) {
    this.allIntervals = new IntervalSet(intervals)
    this.topNode = Node.fromIntervals(intervals)
    this.boundaryTable = SortedMap()
    for (const iv of intervals) {
      this.addBoundaries(iv)
    }
  }
}
