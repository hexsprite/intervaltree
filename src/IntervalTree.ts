import assert from 'assert'
import * as crypto from 'crypto'
import * as lodash from 'lodash'

import { bisectLeft } from './bisect'
import { debug } from './debug'
import { Node } from './Node'
import { Interval } from './Interval'
import { SortedMap, HashSet } from '@rimbu/core'
import { IntervalSortedSet } from './IntervalSet'
import { IntervalTuples } from './types'
import { IntervalHashSet } from './IntervalSet'

export class IntervalTree {
  public allIntervals: HashSet<Interval>
  private topNode: Node
  private boundaryTable: SortedMap<number, number>

  public constructor(intervals: Interval[] = []) {
    this.initialize(intervals)
  }

  public get end() {
    return this.boundaryTable.getKeyAtIndex(-1)
  }

  public get start() {
    return this.boundaryTable.getKeyAtIndex(0, 0)
  }

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

  public fromTuples(intervals: IntervalTuples) {
    return new IntervalTree(
      intervals.map((x) => new Interval(x[0], x[1], x[2]))
    )
  }

  public toArray() {
    return this.allIntervals
      .stream()
      .map((e) => [e.start, e.end, e.data])
      .toArray() as [number, number, unknown]
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
    debug('tree/add', interval)
    if (this.allIntervals.has(interval)) {
      return
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
    assert(start < end, 'start must be <= end')
    const insertionsBuilder = IntervalHashSet.builder<Interval>()
    const startHits = this.search(start).filter((iv) => iv.start < start)
    const endHits = this.search(end).filter((iv) => iv.end > end)
    startHits.forEach((iv) => {
      insertionsBuilder.add(new Interval(iv.start, start, iv.data))
    })
    endHits.forEach((iv) => {
      insertionsBuilder.add(new Interval(end, iv.end, iv.data))
    })
    const insertions = insertionsBuilder.build()
    debug(() => ({
      insertions,
      start,
      end,
      endHits: endHits.toArray(),
      startHits: startHits.toArray(),
    }))
    debug(() => `chop: before=${this.allIntervals.toArray()}`)
    this.removeEnveloped(start, end)
    this.differenceUpdate(startHits)
    this.differenceUpdate(endHits)
    this.update(insertions)
    debug(() => `chop: after=${this.allIntervals.toArray()}`)
  }

  chopAll(intervals: [number, number][]) {
    intervals.forEach(([start, end]) => {
      const insertionsBuilder = IntervalHashSet.builder<Interval>()
      const startHits = this.search(start).filter((iv) => iv.start < start)
      const endHits = this.search(end).filter((iv) => iv.end > end)
      startHits.forEach((iv) => {
        insertionsBuilder.add(new Interval(iv.start, start, iv.data))
      })
      endHits.forEach((iv) => {
        insertionsBuilder.add(new Interval(end, iv.end, iv.data))
      })
      const insertions = insertionsBuilder.build()
      debug(() => ({
        insertions,
        start,
        end,
        endHits: endHits.toArray(),
        startHits: startHits.toArray(),
      }))
      debug(() => `chop: before=${this.allIntervals.toArray()}`)
      this.removeEnveloped(start, end)
      this.differenceUpdate(startHits)
      this.differenceUpdate(endHits)
      this.update(insertions)
      debug(() => `chop: after=${this.allIntervals.toArray()}`)
    })
  }

  /**
   * Given an iterable of intervals, add them to the tree.
   * Completes in O(m*log(n+m)), where m = number of intervals to add.
   */
  public update(intervals: HashSet<Interval>) {
    intervals.forEach((iv) => {
      this.add(iv)
    })
  }

  public differenceUpdate(other: HashSet<Interval>) {
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
    debug('remove', interval)
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
        if (err instanceof RangeError) {
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
    const sortedIntervals = IntervalSortedSet.from(this.allIntervals)
    return `IntervalTree([ ${sortedIntervals.toArray().join(', ')} ])`
  }

  public printStructure() {
    if (this.topNode) {
      this.topNode.printStructure()
    }
  }

  public mergeOverlaps() {
    const merged: Interval[] = []
    let currentReduced: unknown

    const newSeries = (higher: Interval) => {
      currentReduced = higher.data
      merged.push(higher)
    }

    const sortedIntervals = IntervalSortedSet.from(this.allIntervals)
    sortedIntervals.forEach((higher) => {
      if (!merged.length) {
        newSeries(higher)
        return
      }
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
    })

    this.initialize(merged)
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
  ): HashSet<Interval> {
    if (!this.topNode) {
      return IntervalHashSet.empty()
    }
    const resultBuilder = IntervalHashSet.builder<Interval>()
    if (end === undefined) {
      return this.topNode.searchPoint(start, resultBuilder).build()
    }
    let result = this.topNode.searchPoint(start, resultBuilder).build()
    const keysArray = this.boundaryTable.streamKeys().toArray()
    const boundStart = bisectLeft(keysArray, start)
    const boundEnd = bisectLeft(keysArray, end) // exclude final end bound
    // debug(
    //   () =>
    //     `search: start=${start} end=${end} strict=${strict} boundaryTable=${keysArray}`
    // )
    // debug(() => `search: boundStart=${boundStart} boundEnd=${boundEnd}`)
    result = result.addAll(
      this.topNode.searchOverlap(
        lodash.range(boundStart, boundEnd).map((index) => keysArray[index])
      )
    )

    // TODO: improve strict search to use node info instead of less-efficient filtering
    if (strict) {
      result = result.filter((iv) => iv.start >= start && iv.end <= end)
    }
    // debug(() => 'search: result=', result.toArray())
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
    tree.topNode = this.topNode?.clone()
    tree.boundaryTable = this.boundaryTable
    tree.allIntervals = this.allIntervals
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

    const allChildren = this.topNode.allChildren()
    assert(
      allChildren.difference(this.allIntervals).isEmpty,
      `Error: the tree and the membership set are out of sync! ` +
        `fromNodes=${this.topNode.allChildren()} ` +
        `allIntervals=${this.allIntervals}`
    )

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

  private addBoundaries(interval: Interval) {
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

  private initialize(intervals: Interval[] = []) {
    this.allIntervals = IntervalHashSet.from(intervals)
    this.topNode = Node.fromIntervals(intervals)!
    this.boundaryTable = SortedMap.empty()
    this.addBoundariesAll(intervals)
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

  private removeBoundaries(interval: Interval) {
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
}
