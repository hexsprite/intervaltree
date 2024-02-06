import { SortedMap } from '@rimbu/core'
import * as lodash from 'lodash'
import assert from 'node:assert'
import * as crypto from 'node:crypto'

import { Interval } from './Interval'
import { IntervalHashSet } from './IntervalHashSet'
import { IntervalSortedSet } from './IntervalSortedSet'
import { Node } from './Node'
import { bisectLeft } from './bisect'
import { IntervalTuples } from './types'

// import { debug } from './debug'

/**
 * Represents an interval tree data structure.
 */
export class IntervalTree {
  private allIntervals: IntervalHashSet
  private topNode: Node
  private boundaryTable: SortedMap<number, number>

  public constructor(intervals: Interval[] = []) {
    this.initialize(intervals)
  }

  /**
   * Gets the end value of the interval tree.
   * @returns The end value.
   */
  public get end() {
    return this.boundaryTable.getKeyAtIndex(-1)
  }

  /**
   * Gets the start value of the interval tree.
   * @returns The start value.
   */
  public get start() {
    return this.boundaryTable.getKeyAtIndex(0)
  }

  /** Size of the interval tree by number of intervals */
  public get size() {
    return this.allIntervals.size
  }

  /**
   * Creates an IntervalTree from an array of interval tuples.
   * @param intervals - The array of interval tuples.
   * @returns The created IntervalTree.
   */
  public static fromTuples(intervals: IntervalTuples) {
    return new IntervalTree(
      intervals.map((x) => new Interval(x[0], x[1], x[2]))
    )
  }

  /**
   * Returns an array representation of the intervals in the interval tree.
   *
   * @returns An array of intervals.
   */
  public toArray() {
    return this.allIntervals.toArray()
  }

  /**
   * Converts the IntervalTree to a JSON representation.
   * @returns {Interval[]} The JSON representation of the IntervalTree.
   */
  public toJSON() {
    return this.toArray()
  }

  /**
   * Calculates the hash value of the IntervalTree instance.
   * @returns The hash value as a hexadecimal string.
   */
  public hash() {
    const hash = crypto.createHash('sha256')
    hash.update(JSON.stringify(this))
    return hash.digest('hex')
  }

  /**
   * Adds an interval to the interval tree.
   * If the interval already exists in the tree, it is not added again.
   */
  public add(interval: Interval) {
    if (this.allIntervals.has(interval)) {
      return
    }
    if (!this.topNode) {
      this.topNode = Node.fromInterval(interval)
    } else {
      this.topNode = this.topNode.add(interval)
    }
    this.allIntervals.add(interval)
    this.addBoundaries(interval)
  }

  /**
   * Adds an interval to the interval tree.
   *
   * @param start - The start value of the interval.
   * @param end - The end value of the interval.
   * @param data - Optional data associated with the interval.
   */
  public addInterval(start: number, end: number, data?: unknown): void {
    const interval = new Interval(start, end, data)
    this.add(interval)
  }

  /**
   * Removes intervals that overlap with the specified range and updates the
   * interval tree accordingly.
   * Like removeEnveloped(), but trims back Intervals hanging into the chopped
   * area so that nothing overlaps.
   * @param start The start of the range.
   * @param end The end of the range.
   */
  public chop(start: number, end: number): void {
    assert(start < end, 'start must be <= end')
    const insertions = new IntervalHashSet()
    const startHits = this.search(start).filter((iv) => iv.start < start)
    const endHits = this.search(end).filter((iv) => iv.end > end)
    startHits.forEach((iv) => {
      insertions.add(new Interval(iv.start, start, iv.data))
    })
    endHits.forEach((iv) => {
      insertions.add(new Interval(end, iv.end, iv.data))
    })
    this.removeEnveloped(start, end)
    this.differenceUpdate(startHits)
    this.differenceUpdate(endHits)
    this.update(insertions.toArray())
  }

  /**
   * Given an iterable of intervals, add them to the tree.
   * Completes in O(m*log(n+m)), where m = number of intervals to add.
   */
  public update(intervals: Interval[] | IntervalHashSet) {
    intervals.forEach((iv: Interval) => {
      this.add(iv)
    })
  }

  /**
   * Removes the intervals in the specified array or IntervalHashSet from the IntervalTree.
   * @param other - The array or IntervalHashSet containing the intervals to be removed.
   */
  public differenceUpdate(other: Interval[] | IntervalHashSet) {
    other.forEach((iv) => {
      this.discard(iv)
    })
  }

  /**
   * Removes an interval from the tree, if present. If not, does nothing.
   *
   * @param interval The interval to be removed.
   * @returns True if the interval was removed, false otherwise.
   *
   * @remarks
   * This operation completes in O(log n) time.
   */
  public discard(interval: Interval) {
    return this.remove(interval, true)
  }

  /**
   * Removes an interval from the tree, if present. If not, raises RangeError.
   *
   * @param interval - The interval to remove.
   * @param ignoreMissing - If true, no error will be thrown if the interval is not found in the tree.
   * @returns void
   *
   * @throws {RangeError} If the interval is not found in the tree and ignoreMissing is false.
   *
   * @remarks
   * This operation completes in O(log n) time.
   */
  public remove(interval: Interval, ignoreMissing = false) {
    if (!this.allIntervals.has(interval)) {
      if (ignoreMissing) {
        return
      }
      throw new RangeError('interval not found')
    }
    this.topNode = this.topNode.remove(interval)
    this.allIntervals.remove(interval)
    this.removeBoundaries(interval)
  }

  /**
   * Removes all intervals completely enveloped in the given range.
   *
   * @param start The start of the range.
   * @param end The end of the range.
   * @returns void
   *
   * @remarks
   * This method completes in O((r+m)*log n) time, where:
   * - n = size of the tree
   * - m = number of matches
   * - r = size of the search range (this is 1 for a point)
   */
  public removeEnveloped(start: number, end: number) {
    const hitlist = this.search(start, end, true)
    hitlist.forEach((iv) => {
      try {
        this.remove(iv)
      } catch (err) {
        if (err instanceof RangeError) {
          err.message += `
removeEnveloped(${start}, ${end})
allIntervals=${this.allIntervals.toArray()}
hitlist=${hitlist}
badInterval=${iv}
`
          // rethrow error now that we added more debug info
          throw err
        }
      }
    })
  }

  /**
   * Merges overlapping intervals in the IntervalTree.
   * @returns void
   */
  public mergeOverlaps() {
    const merged: Interval[] = []
    let currentReduced: unknown

    const newSeries = (higher: Interval) => {
      currentReduced = higher.data
      merged.push(higher)
    }

    const sortedIntervals = IntervalSortedSet.from(this.allIntervals.toArray())
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
   * Searches for intervals within the specified range.
   *
   * @param start - The start value of the range.
   * @param end - The end value of the range. If not provided, only intervals that contain the start value will be returned.
   * @param strict - Determines whether strict search should be performed. If true, only intervals that are completely within the range will be returned.
   * @returns An array of intervals that match the search criteria.
   */
  public search(start: number, end?: number, strict = false): Interval[] {
    if (!this.topNode) {
      return []
    }

    let result: Interval[] = []
    if (end === undefined) {
      this.topNode.searchPoint(start, result)
      return result
    }

    this.topNode.searchPoint(start, result)
    const keysArray = this.boundaryTable.streamKeys().toArray()
    const boundStart = bisectLeft(keysArray, start)
    const boundEnd = bisectLeft(keysArray, end) // exclude final end bound
    // debug(
    //   () =>
    //     `search: start=${start} end=${end} strict=${strict} boundaryTable=${keysArray}`
    // )
    // debug(() => `search: boundStart=${boundStart} boundEnd=${boundEnd}`)
    const overlaps = this.topNode.searchOverlap(
      lodash.range(boundStart, boundEnd).map((index) => keysArray[index])
    )
    if (overlaps.length > 0) {
      result = result.concat(overlaps)
      // remove any duplicate intervals
      result = IntervalSortedSet.from(result).toArray()
    }

    // TODO: improve strict search to use node info instead of less-efficient filtering
    if (strict) {
      result = result.filter((iv) => iv.start >= start && iv.end <= end)
    }

    return result
  }

  /**
   * Searches for intervals of a specific length starting at a given position.
   * @param length The length of the intervals to search for.
   * @param start The starting position to search from.
   * @returns An array of intervals that match the specified length and starting position.
   */
  public searchByLengthStartingAt(length: number, start: number): Interval[] {
    return this.topNode.searchByLengthStartingAt(length, start, [])
  }

  /**
   * Finds the first interval in the tree that has a length greater than or equal to the specified minimum length,
   * starting at the specified starting time.
   *
   * @param minLength - The minimum length of the interval to search for.
   * @param startingAt - The starting time of the interval to search for.
   * @param filterFn - An optional filter function to further refine the search.
   * @returns The first interval that matches the search criteria, or undefined if no such interval is found.
   */
  public findFirstIntervalByLengthStartingAt(
    minLength: number,
    startingAt: number,
    filterFn?: (iv: Interval) => boolean
  ): Interval | undefined {
    const foundInterval = this.topNode?.findFirstIntervalByLengthStartingAt(
      minLength,
      startingAt,
      filterFn
    )
    // adjust returned interval to match the requested start time
    if (foundInterval && foundInterval.start < startingAt) {
      return new Interval(startingAt, foundInterval.end, foundInterval.data)
    }
    return foundInterval
  }

  /**
   * Creates a shallow copy of the IntervalTree.
   *
   * @returns A new IntervalTree with shallow copies of the intervals.
   */
  public clone(): IntervalTree {
    const tree = new IntervalTree()
    tree.topNode = this.topNode?.clone()
    tree.boundaryTable = this.boundaryTable
    tree.allIntervals = new IntervalHashSet(this.allIntervals)
    return tree
  }

  /**
   * Checks the tree to ensure that the invariants are held.
   * @remarks
   * This method is for debugging purposes only.
   */
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
      allChildren.difference(this.allIntervals).size === 0,
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
    // assert(
    //   this.boundaryTable.difference(boundaryCheck),
    //   'boundaryTable is out of sync with the intervals in the tree'
    // )

    // Internal tree structure
    this.topNode.verify()
  }

  public toString() {
    const sortedIntervals = IntervalSortedSet.from(this.allIntervals.toArray())
    return `IntervalTree([ ${sortedIntervals.toArray().join(', ')} ])`
  }

  public printStructure() {
    if (this.topNode) {
      this.topNode.printStructure()
    }
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
    this.allIntervals = new IntervalHashSet(intervals)
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
