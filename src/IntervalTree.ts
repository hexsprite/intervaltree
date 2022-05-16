import * as assert from 'assert'
import * as crypto from 'crypto'
import * as lodash from 'lodash'

import { bisectLeft } from './bisect'
import { debug } from './debug'
import { Node } from './Node'
import { Interval } from './Interval'
import { SortedMap, SortedSet } from '@rimbu/sorted'
import { IntervalSet } from './IntervalSet'

export type SimpleIntervalArray = Array<
  [number, number, unknown] | [number, number]
>

export class IntervalTree {
  public static fromJSON(nodes: string | Interval[]) {
    const intervals: Interval[] = []
    if (typeof nodes === 'string') {
      nodes = JSON.parse(nodes) as Interval[]
    }
    for (const node of nodes) {
      intervals.push(new Interval(node.start, node.end, node.data))
    }
    return new IntervalTree(intervals)
  }

  public allIntervals: SortedSet<Interval>
  private topNode: Node
  private boundaryTable: SortedMap<number, number>

  public constructor(intervals: Interval[] = []) {
    this.__init(intervals)
  }

  public initFromArray(intervals: Interval[]) {
    this.__init(intervals)
  }

  public initFromSimpleArray(intervals: SimpleIntervalArray) {
    this.initFromArray(intervals.map((x) => new Interval(x[0], x[1], x[2])))
  }

  public toArray() {
    return this.allIntervals
      .stream()
      .map((e) => [e.start, e.end, e.data])
      .toArray() as [number, number, unknown]
  }
  a

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
    this.allIntervals = this.allIntervals.add(interval)
    this.addBoundaries(interval)
  }

  public addInterval(start: number, end: number, data?: unknown): void {
    const interval = new Interval(start, end, data)
    this.add(interval)
  }

  /**
   * Like removeEnveloped(), but trims back Intervals hanging into the chopped
   * area so that nothing overlaps.
   * @param start
   * @param end
   */
  public chop(start: number, end: number): void {
    if (start > end) {
      throw TypeError('invalid parameters to chop')
    }
    let insertions = IntervalSet.empty()
    const startHits = this.search(start).filter((iv) => iv.start < start)
    const endHits = this.search(end).filter((iv) => iv.end > end)
    startHits.forEach((iv) => {
      insertions = insertions.add(new Interval(iv.start, start, iv.data))
    })
    endHits.forEach((iv) => {
      insertions = insertions.add(new Interval(end, iv.end, iv.data))
    })
    debug(() => ({
      end,
      endHits: endHits.toArray(),
      insertions: insertions.toArray(),
      start,
      startHits: startHits.toArray(),
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
  public update(intervals: SortedSet<Interval>) {
    intervals.forEach((iv) => {
      this.add(iv)
    })
  }

  public differenceUpdate(other: SortedSet<Interval>) {
    other.forEach((iv) => {
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
    this.allIntervals = this.allIntervals.remove(interval)
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
    hitlist.forEach((iv) => {
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
    this.allIntervals.toArray().forEach((iv) => {
      console.log(`[${iv.start}, ${iv.end}, ${iv.data}],`)
    })
  }

  public mergeOverlaps() {
    const merged: Interval[] = []
    let currentReduced: any

    const newSeries = (higher: Interval) => {
      currentReduced = higher.data as any
      merged.push(higher)
    }

    this.allIntervals.forEach((higher) => {
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
    return this.boundaryTable.getValueAtIndex(-1)
  }

  public start() {
    return this.boundaryTable.getValueAtIndex(0, 0)
  }

  public first() {
    return this.allIntervals.getAtIndex(0)
  }

  public last() {
    return this.allIntervals.getAtIndex(-1)
  }

  public addBoundaries(interval: Interval) {
    const { start, end } = interval
    const addBoundary = (point: number) => {
      if (this.boundaryTable.hasKey(point)) {
        this.boundaryTable = this.boundaryTable.set(
          point,
          this.boundaryTable.get(point)! + 1
        )
      } else {
        this.boundaryTable = this.boundaryTable.set(point, 1)
      }
    }
    addBoundary(start)
    addBoundary(end)
  }

  private addBoundariesAll(intervals: Interval[]) {
    const boundaries = this.boundaryTable.toBuilder()

    // Adds the boundaries of all intervals in the list to the boundary table.
    intervals.forEach((iv) => {
      const { start, end } = iv
      const addBoundary = (point: number) => {
        if (boundaries.hasKey(point)) {
          boundaries.set(point, boundaries.get(point)! + 1)
        } else {
          boundaries.set(point, 1)
        }
      }
      addBoundary(start)
      addBoundary(end)
    })
    this.boundaryTable = boundaries.build()
  }

  public removeBoundaries(interval: Interval) {
    // Removes the boundaries of the interval from the boundary table.
    const updateValue = (key: number) => {
      let boundaries = this.boundaryTable
      if (boundaries.get(key) === 1) {
        boundaries = boundaries.removeKey(key)
      } else {
        boundaries = boundaries.set(key, boundaries.get(key)! - 1)
      }
      this.boundaryTable = boundaries
    }
    updateValue(interval.start)
    updateValue(interval.end)
  }

  public slice(start?: number, stop?: number): SortedSet<Interval> {
    if (start === undefined) {
      start = this.start()
      if (stop === undefined) {
        return this.allIntervals
      }
    }
    if (stop === undefined) {
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
    end?: number,
    strict = false
  ): SortedSet<Interval> {
    if (!this.topNode) {
      return IntervalSet.empty()
    }
    if (end === undefined) {
      return this.topNode.searchPoint(start, IntervalSet.empty())
    }
    let result = this.topNode.searchPoint(start, IntervalSet.empty())
    const keysArray = this.boundaryTable.streamKeys().toArray()
    const boundStart = bisectLeft(keysArray, start)
    const boundEnd = bisectLeft(keysArray, end) // exclude final end bound
    debug(
      () =>
        `search: start=${start} end=${end} strict=${strict} boundaryTable=${keysArray}`
    )
    debug(() => `search: boundStart=${boundStart} boundEnd=${boundEnd}`)
    result = result.addAll(
      this.topNode.searchOverlap(
        lodash.range(boundStart, boundEnd).map((index) => keysArray[index])
      )
    )

    // TODO: improve strict search to use node info instead of less-efficient filtering
    if (strict) {
      result = result.filter((iv) => iv.start >= start && iv.end <= end)
    }
    debug(() => 'search: result=', result.toArray())
    return result
  }

  public searchByLengthStartingAt(length: number, start: number): Interval[] {
    // find all intervals that overlap start
    // adjust nodes to match the start time
    const intervals = this.search(start, Infinity)
      .stream()
      .map((iv) =>
        // return a new node with changed start time if necessary
        iv.start < start ? new Interval(start, iv.end, iv.data) : iv
      )
      .filter((iv) => iv.length >= length)
      .toArray()
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
    tree.boundaryTable = this.boundaryTable //.clone(1)
    tree.allIntervals = this.allIntervals //new IntervalSet(this.allIntervals)
    return tree
  }

  public verify() {
    /*
    DEBUG ONLY
    Checks the table to ensure that the invariants are held.
    */
    if (!this.allIntervals.size) {
      // Verify empty tree
      assert(!this.boundaryTable.size, 'boundary table should be empty')
      assert(!this.topNode, "topNode isn't None")
      return
    }

    assert(
      lodash.isEqual(
        this.topNode.allChildren().toArray(),
        this.allIntervals.toArray()
      ),
      `Error: the tree and the membership set are out of sync! ` +
        `fromNodes=${this.topNode.allChildren().toArray()} ` +
        `allIntervals=${this.allIntervals.toArray()}`
    )

    // No null intervals
    this.allIntervals.forEach((iv) => {
      assert(!iv.isNull(), 'null Interval objects not allowed in IntervalTree')
    })

    // Reconstruct boundaryTable
    let boundaryCheck = SortedMap.empty<number, number>()
    this.allIntervals.forEach((iv) => {
      if (boundaryCheck.hasKey(iv.start)) {
        boundaryCheck = boundaryCheck.set(
          iv.start,
          boundaryCheck.get(iv.start)! + 1
        )
      } else {
        boundaryCheck = boundaryCheck.set(iv.start, 1)
      }
      if (boundaryCheck.hasKey(iv.end)) {
        boundaryCheck = boundaryCheck.set(
          iv.end,
          boundaryCheck.get(iv.end)! + 1
        )
      } else {
        boundaryCheck = boundaryCheck.set(iv.end, 1)
      }
    })

    // Reconstructed boundary table (bound_check) ==? boundary_table
    //   assert(
    //     this.boundaryTable.equals(boundaryCheck),
    //     'boundaryTable is out of sync with the intervals in the tree'
    //   )

    // Internal tree structure
    this.topNode.verify()
  }

  private __init(intervals: any) {
    this.allIntervals = IntervalSet.from(intervals)
    this.topNode = Node.fromIntervals(intervals)!
    this.boundaryTable = SortedMap.empty()
    this.addBoundariesAll(intervals)
  }
}
