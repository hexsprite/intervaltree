import assert from 'node:assert'
import { Interval } from './Interval'
import { DEBUG } from './IntervalTree'
import { compareIntervals } from './compareIntervals'

const LEFT = 0
const RIGHT = 1
type Direction = 0 | 1 | true | false

// const debug = (...args: any[]) => console.log(...args)

export class Node {
  values: Interval[] = []
  start: number
  height = 1 // default height for AVL node
  minStart = 0
  maxEnd = 0
  maxLength = 0

  #branch: [Node | null, Node | null] = [null, null]

  constructor(value: Interval) {
    this.values = [value]
    this.start = value.start
    this.updateAttributes()
  }

  public get balance() {
    return (this.right?.height ?? 0) - (this.left?.height ?? 0)
  }

  private get left() {
    return this.#branch[LEFT]
  }

  private get right() {
    return this.#branch[RIGHT]
  }

  private set left(node: Node | null) {
    this.#branch[LEFT] = node
  }

  private set right(node: Node | null) {
    this.#branch[RIGHT] = node
  }

  static fromIntervals(intervals: Interval[]): Node {
    assert(intervals.length > 0, 'Error: intervals must not be empty')
    const sortedIntervals = intervals.toSorted(compareIntervals)
    let newNode = new Node(sortedIntervals[0])
    for (const interval of sortedIntervals.slice(1))
      newNode = newNode.insert(interval)

    return newNode
  }

  branch(direction: Direction) {
    return this.#branch[direction ? RIGHT : LEFT]
  }

  setBranch(direction: Direction, node: Node | null) {
    this.#branch[direction ? RIGHT : LEFT] = node
  }

  insert(interval: Interval): Node {
    // if the interval starts at the same point as this node, add it to the values
    if (this.start === interval.start) {
      // don't add a duplicate
      if (this.values.some(iv => iv.end === interval.end))
        return this

      this.values.push(interval)
      this.updateHeight()
      this.updateAttributes()

      return this
    }

    // search for the correct branch to insert the interval
    const direction = this.start < interval.start // true = right
    let branchNode = this.branch(direction)

    if (branchNode)
      branchNode = branchNode.insert(interval)
    else
      branchNode = new Node(interval)

    this.setBranch(direction, branchNode)
    this.updateHeight()
    this.updateAttributes()

    return this.rotate()
  }

  rotate() {
    this.updateHeight()
    if (Math.abs(this.balance) < 2) {
      // no rebalancing needed
      return this
    }

    // determine the directionality of the imbalance in this node and the heavy child
    const pivotNodeDirection = this.balance > 0
    const heavyChild = this.branch(pivotNodeDirection)!
    const heavyChildDirection = heavyChild.balance > 0

    let rotatedSubtreeRoot: Node
    if (
      pivotNodeDirection === heavyChildDirection
      || heavyChild.balance === 0
    )
      rotatedSubtreeRoot = this.singleRotate()
      // console.log("singleRotate");
    else
      rotatedSubtreeRoot = this.doubleRotate()
      // console.log("doubleRotate");

    rotatedSubtreeRoot.updateHeight()

    rotatedSubtreeRoot.verify()
    return rotatedSubtreeRoot
  }

  doubleRotate(): Node {
    assert(this.balance !== 0, 'doubleRotate called on balanced node')
    const heavyDirection = this.balance > 0
    const oppositeDirection = !heavyDirection

    const heavyChild = this.branch(heavyDirection)
    assert(heavyChild, 'heavyChild is null')

    // Perform a single rotation on the heavy child in the opposite direction
    const pivotNode = heavyChild.branch(oppositeDirection)
    assert(pivotNode, 'pivotNode is null')

    heavyChild.setBranch(oppositeDirection, pivotNode.branch(heavyDirection))
    pivotNode.setBranch(heavyDirection, heavyChild)

    heavyChild.updateHeight()
    pivotNode.updateHeight()
    heavyChild.updateAttributes()
    pivotNode.updateAttributes()

    this.setBranch(heavyDirection, pivotNode)
    this.updateAttributes()

    return this.singleRotate()
  }

  singleRotate(): Node {
    assert(this.balance !== 0, 'singleRotate called on balanced node')
    const pivotNodeDirection = this.balance > 0
    const oppositeDirection = !pivotNodeDirection

    const heavyChild = this.branch(pivotNodeDirection)!

    // Adjusting branches for rotation
    this.setBranch(pivotNodeDirection, heavyChild.branch(oppositeDirection))
    heavyChild.setBranch(oppositeDirection, this)

    // Update heights
    this.updateHeight()
    heavyChild.updateHeight()

    // Update Max
    this.updateAttributes()
    heavyChild.updateAttributes()

    return heavyChild
  }

  updateAttributes() {
    this.minStart = Math.min(
      ...this.values.map(iv => iv.start),
      this.left?.minStart ?? Number.POSITIVE_INFINITY,
      this.right?.minStart ?? Number.POSITIVE_INFINITY,
    )
    this.maxEnd = Math.max(
      ...this.values.map(iv => iv.end),
      this.left?.maxEnd ?? Number.NEGATIVE_INFINITY,
      this.right?.maxEnd ?? Number.NEGATIVE_INFINITY,
    )
    this.maxLength = Math.max(
      ...this.values.map(iv => iv.length),
      this.left?.maxLength ?? 0,
      this.right?.maxLength ?? 0,
    )
  }

  updateHeight() {
    this.height = 1 + Math.max(this.left?.height ?? 0, this.right?.height ?? 0)
  }

  searchPoint(point: number, result: Interval[]) {
    if (point < this.minStart || point > this.maxEnd)
      return

    for (const value of this.values) {
      if (value.containsPoint(point))
        result.push(value)
    }
    if (this.left && point >= this.left.minStart)
      this.left.searchPoint(point, result)

    if (this.right && point <= this.right.maxEnd)
      this.right.searchPoint(point, result)
  }

  // print structure recursively, showing branches with extra spaces
  printStructure(indent = 0, prefix = '') {
    console.error(
      `${'  '.repeat(indent)
         }${prefix}Node(${this.values}, maxEnd=${this.maxEnd} height=${this.height} balance=${this.balance})`,
    )
    if (this.left)
      this.left.printStructure(indent + 1, (prefix = '< '))

    if (this.right)
      this.right.printStructure(indent + 1, (prefix = '> '))
  }

  toArray(): Interval[] {
    let result = [...this.values]
    if (this.left)
      result = result.concat(this.left.toArray())

    if (this.right)
      result = result.concat(this.right.toArray())

    return result
  }

  remove(interval: Interval, rebalance: [true?] = []): Node | null {
    // Navigate the tree to find the correct node
    // eslint-disable-next-line ts/no-this-alias
    let result: Node = this

    if (interval.start < this.start) {
      this.left = this.left?.remove(interval, rebalance) ?? null
    }
    else if (interval.start > this.start) {
      this.right = this.right?.remove(interval, rebalance) ?? null
    }
    else {
      // Found the node with the matching start value, now remove the specific interval
      const index = this.values.findIndex(
        iv => iv.end === interval.end && iv.data === interval.data,
      )
      if (index > -1) {
        this.values.splice(index, 1) // Remove the interval from this node

        // If no more intervals are left in the node, handle node removal
        if (this.values.length === 0) {
          rebalance.push(true)
          if (this.left && this.right) {
            const successor = this.right.findMin().clone()
            // filter the successor from the right node - possibly inefficient
            for (const value of successor.values)
              this.right = this.right?.remove(value, rebalance) ?? null

            // replace the current node with the successor
            successor.left = this.left
            successor.right = this.right
            result = successor
          }
          else {
            // if only one child, return that child, otherwise null
            return this.left ?? this.right ?? null
          }
        }
      }
    }
    result.updateAttributes()
    if (rebalance.length)
      return result.rotate()

    return result
  }

  clone(): Node {
    const node = new Node(this.values[0])
    node.values = [...this.values]
    node.left = this.left?.clone() ?? null
    node.right = this.right?.clone() ?? null
    node.updateAttributes()
    return node
  }

  /**
   * Finds the first interval that meets the specified length and starting
   * position criteria.
   * @param minLength The minimum length of the interval.
   * @param startingAt Minimum start of the interval.
   * @returns The first interval that meets the criteria, or undefined if no
   *          interval is found.
   */
  public findOneByLengthStartingAt(
    minLength: number,
    startingAt: number,
      filterFn: (iv: Interval) => boolean = () => true,
  ): Interval | undefined {
    // Skip this branch if it cannot contain a qualifying interval
    if (this.shouldSkipBranch(minLength, startingAt))
      return

    // Filter `this.sCenter` before finding the minimum to ensure only eligible intervals are considered.
    const eligibleIntervals = this.values.filter((iv) => {
      if (iv.end < startingAt)
        return false // Skip intervals ending before `startingAt`

      const adjustedLength = iv.length - Math.max(0, startingAt - iv.start)
      if (adjustedLength < minLength)
        return false // Skip intervals shorter than `minLength` after adjustment

      return filterFn(iv) // Apply custom filter function if provided
    })

    // Include eligible intervals from left and right children, if any
    const leftCandidate = this.branch(0)?.findOneByLengthStartingAt(
      minLength,
      startingAt,
      filterFn,
    )

    const rightCandidate = this.branch(1)?.findOneByLengthStartingAt(
      minLength,
      startingAt,
      filterFn,
    )

    // Add child candidates to the list of eligible intervals
    if (leftCandidate)
      eligibleIntervals.push(leftCandidate)
    if (rightCandidate)
      eligibleIntervals.push(rightCandidate)

    // Find the interval with the minimum start (and end as a tiebreaker) from the filtered list
    return eligibleIntervals.reduce(
      (minInterval: Interval | undefined, currentInterval) => {
        if (!minInterval)
          return currentInterval // If first comparison, return current interval

        return currentInterval.start < minInterval.start
          || (currentInterval.start === minInterval.start
          && currentInterval.end < minInterval.end)
          ? currentInterval
          : minInterval
      },
      undefined,
    ) // Initial value is the first eligible interval
  }

  public searchByLengthStartingAt(
    minLength: number,
    startingAt: number,
    result: Interval[],
  ) {
    // Skip this branch if it cannot contain a qualifying interval
    if (this.shouldSkipBranch(minLength, startingAt))
      return result

    // search intervals that start at startingAt
    this.values.forEach((interval) => {
      if (interval.end < startingAt)
        return
      const adjustedLength
          = interval.length - Math.max(0, startingAt - interval.start)
      if (adjustedLength >= minLength) {
        if (interval.start < startingAt)
          interval = new Interval(startingAt, interval.end)

        result.push(interval)
      }
    })

    this.branch(0)?.searchByLengthStartingAt(minLength, startingAt, result)
    this.branch(1)?.searchByLengthStartingAt(minLength, startingAt, result)
    return result
  }

  searchOverlap(
    start: number,
    end: number,
      result: Interval[] = [],
  ): Interval[] {
    // Check current node's intervals for overlap
    this.values.forEach((interval) => {
      if (interval.end >= start && interval.start <= end)
        result.push(interval)
    })

    // Traverse left subtree if it might contain overlapping intervals
    if (this.left && start <= this.left.maxEnd)
      this.left.searchOverlap(start, end, result)

    // Traverse right subtree if it might contain overlapping intervals
    // Since intervals are keyed on their start value, we check against the start for the right subtree
    if (this.right && end >= this.right.minStart)
      this.right.searchOverlap(start, end, result)

    return result
  }

  findMin(): Node {
    if (this.left)
      return this.left.findMin()

    return this
  }

  public verify(parents: Set<number> = new Set()) {
    if (!DEBUG)
      return

    // Node is balanced
    const bal = this.balance
    if (Math.abs(bal) > 1)
      this.printStructure()

    assert(
      Math.abs(bal) < 2,
      `Error: Rotation should have happened, but didn't! balance=${bal}`,
    )

    // balance is up-to-date
    this.updateHeight()
    assert.equal(
      bal,
      this.balance,
      `Error: (x=${this.start}) balance not set correctly!`,
    )

    // verify all values have the same start
    const startValues = Array.from(new Set(this.values.map(iv => iv.start)))
    assert(startValues.length === 1, `different start values: ${startValues}`)

    // verify this.start is equal to the start of the first interval
    const actualStart = this.values?.[0].start ?? 0
    assert.strictEqual(
      this.start,
      actualStart,
      `start incorrect (this.start=${this.start}, actual=${actualStart})`,
    )

    // verify maxLength
    const actualMaxLength = this.calcMaxLength()
    assert(
      this.maxLength === actualMaxLength,
      `maxlength incorrect, this.maxLength=${this.maxLength}, actual=${actualMaxLength}`,
    )

    const actualMaxEnd = this.calcMaxEnd()
    // if (this.maxEnd !== actualMaxEnd) {
    //   this.printStructure()
    // }
    assert(
      this.maxEnd === actualMaxEnd,
      `(${this.start}) maxEnd incorrect, this.maxEnd=${this.maxEnd}, actual=${actualMaxEnd}`,
    )

    // recursively verify branches
    const newParents = new Set(parents)
    newParents.add(this.start)

    if (this.left) {
      assert(
        this.left.start <= this.start,
        `(${this.start}) left child out of order (${this.left.start} < ${this.start})`,
      )
      this.left.verify(newParents)
    }

    if (this.right) {
      assert(
        this.right.start > this.start,
        `(${this.start}) right child out of order (${this.right.start} > ${this.start})`,
      )
      this.right.verify(newParents)
    }
  }

  // can replace with walkNodes
  calcMaxLength(): number {
    return Math.max(
      ...this.values.map(iv => iv.length),
      this.left?.calcMaxLength() ?? 0,
      this.right?.calcMaxLength() ?? 0,
    )
  }

  calcMaxEnd(): number {
    return Math.max(
      ...this.values.map(iv => iv.end),
      this.left?.calcMaxEnd() ?? Number.NEGATIVE_INFINITY,
      this.right?.calcMaxEnd() ?? Number.NEGATIVE_INFINITY,
    )
  }

  private shouldSkipBranch(minLength: number, startingAt: number) {
    if (this.maxEnd < startingAt) {
      // debug(
      //   `${this.toString()} searchPoint: maxEnd skipping subtree (maxEnd=${
      //     this.maxEnd
      //   }`
      // );
      return true // Skip this subtree
    }
    else if (this.maxLength < minLength) {
      // debug(`${this.toString()} searchPoint: maxLength skipping subtree`);
      return true // Skip this subtree
    }
    return false
  }
}
