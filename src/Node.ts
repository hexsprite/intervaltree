import { strict as assert } from 'node:assert'
import { compareIntervals } from './compareIntervals'
import { Interval } from './Interval'

const LEFT = false
const RIGHT = true
type Direction = boolean

// Shared mutable flags to avoid allocating [boolean] arrays per recursive call
const _rebalancingDone = [false]
const _updateRequired = [false]
const _rebalance = [false]
/** Set to true by insert() when a duplicate was detected and nothing was added */
export const _flags = {
  /** Set to true by insert() when a duplicate was detected and nothing was added */
  insertWasDuplicate: false,
  /** Set to true by remove() when the interval was actually found and removed */
  removeSucceeded: false,
}

export class Node<T = unknown> {
  values: Interval<T>[] = []
  start: number
  height = 1 // default height for AVL node
  minStart = 0
  maxEnd = 0
  maxLength = 0

  _left: Node<T> | null = null
  _right: Node<T> | null = null

  constructor(value: Interval<T>) {
    this.values = [value]
    this.start = value.start
    this.updateAttributes()
  }

  public get balance() {
    return (this._right?.height ?? 0) - (this._left?.height ?? 0)
  }

  static fromIntervals<T>(intervals: Interval<T>[]): Node<T> {
    assert(intervals.length > 0, 'Error: intervals must not be empty')
    const sorted = intervals.toSorted(compareIntervals)
    // Group same-start intervals and dedup, then build balanced tree from groups
    const groups = Node._groupByStart(sorted)
    return Node._buildFromGroups(groups, 0, groups.length - 1)
  }

  /** Like fromIntervals but skips sorting — caller guarantees sorted, non-overlapping input. */
  static fromSortedIntervals<T>(sorted: Interval<T>[]): Node<T> {
    assert(sorted.length > 0, 'Error: intervals must not be empty')
    // Fast path: sorted non-overlapping intervals have unique starts — skip grouping
    return Node._buildSimple(sorted, 0, sorted.length - 1)
  }

  /** Build balanced tree from sorted intervals with unique starts (no grouping needed). */
  private static _buildSimple<T>(sorted: Interval<T>[], lo: number, hi: number): Node<T> {
    if (lo === hi)
      return new Node(sorted[lo])
    if (lo + 1 === hi) {
      const node = new Node(sorted[lo])
      node._right = new Node(sorted[hi])
      node.height = 2
      node.updateAttributes()
      return node
    }
    const mid = (lo + hi) >> 1
    const node = new Node(sorted[mid])
    node._left = Node._buildSimple(sorted, lo, mid - 1)
    node._right = Node._buildSimple(sorted, mid + 1, hi)
    const lh = node._left?.height ?? 0
    const rh = node._right?.height ?? 0
    node.height = 1 + (lh > rh ? lh : rh)
    node.updateAttributes()
    return node
  }

  /** Group sorted intervals by start, deduplicating same start+end. */
  private static _groupByStart<T>(sorted: Interval<T>[]): Array<{ start: number, values: Interval<T>[] }> {
    const groups: Array<{ start: number, values: Interval<T>[] }> = []
    let i = 0
    while (i < sorted.length) {
      const s = sorted[i].start
      const values: Interval<T>[] = [sorted[i]]
      const endsSeen = new Set([sorted[i].end])
      i++
      while (i < sorted.length && sorted[i].start === s) {
        if (!endsSeen.has(sorted[i].end)) {
          values.push(sorted[i])
          endsSeen.add(sorted[i].end)
        }
        i++
      }
      groups.push({ start: s, values })
    }
    return groups
  }

  /**
   * Build a balanced AVL tree from pre-grouped intervals in O(n).
   * Each group has a unique start and 1+ intervals.
   */
  private static _nodeFromGroup<T>(g: { start: number, values: Interval<T>[] }): Node<T> {
    const node = new Node(g.values[0])
    for (let i = 1; i < g.values.length; i++)
      node.values.push(g.values[i])
    return node
  }

  private static _buildFromGroups<T>(groups: Array<{ start: number, values: Interval<T>[] }>, lo: number, hi: number): Node<T> {
    if (lo === hi) {
      const node = Node._nodeFromGroup(groups[lo])
      node.updateAttributes()
      return node
    }
    if (lo + 1 === hi) {
      const node = Node._nodeFromGroup(groups[lo])
      const right = Node._nodeFromGroup(groups[hi])
      node._right = right
      right.updateAttributes()
      node.height = 2
      node.updateAttributes()
      return node
    }

    const mid = (lo + hi) >> 1
    const node = Node._nodeFromGroup(groups[mid])

    node._left = Node._buildFromGroups(groups, lo, mid - 1)
    node._right = Node._buildFromGroups(groups, mid + 1, hi)

    const lh = node._left?.height ?? 0
    const rh = node._right?.height ?? 0
    node.height = 1 + (lh > rh ? lh : rh)
    node.updateAttributes()
    return node
  }

  branch(direction: Direction) {
    return direction ? this._right : this._left
  }

  setBranch(direction: Direction, node: Node<T> | null) {
    if (direction)
      this._right = node
    else this._left = node
  }

  insert(interval: Interval<T>, rebalancingDone: [boolean] = _rebalancingDone, updateRequired: [boolean] = _updateRequired): Node<T> {
    // Reset shared state on top-level call (recursive calls pass explicit refs)
    if (rebalancingDone === _rebalancingDone) {
      _rebalancingDone[0] = false
      _flags.insertWasDuplicate = false
    }
    if (updateRequired === _updateRequired)
      _updateRequired[0] = false

    // if the interval starts at the same point as this node, add it to the values
    if (this.start === interval.start) {
      // don't add a duplicate
      const end = interval.end
      for (let i = 0; i < this.values.length; i++) {
        if (this.values[i].end === end) {
          _flags.insertWasDuplicate = true
          return this
        }
      }

      this.values.push(interval)
      // no rebalancing needed because the height of this node doesn't change
      rebalancingDone[0] = true
      updateRequired[0] = this.updateAttributes()

      return this
    }

    // search for the correct branch to insert the interval
    const dir = this.start < interval.start ? RIGHT : LEFT
    const branchNode = dir === RIGHT ? this._right : this._left

    if (branchNode) {
      const inserted = branchNode.insert(interval, rebalancingDone, updateRequired)
      if (dir === RIGHT)
        this._right = inserted
      else this._left = inserted
      if (updateRequired[0])
        this.updateAttributes()
    }
    else {
      const newNode = new Node(interval)
      if (dir === RIGHT)
        this._right = newNode
      else this._left = newNode
      updateRequired[0] = this.updateAttributes()
    }

    if (!rebalancingDone[0]) {
      this.updateHeight()
      if (this.balance === 0) {
        rebalancingDone[0] = true
        return this
      }
      else if (Math.abs(this.balance) > 1) {
        rebalancingDone[0] = true
        return this.rotate()
      }
    }

    return this
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

    let rotatedSubtreeRoot: Node<T>
    if (
      pivotNodeDirection === heavyChildDirection
      || heavyChild.balance === 0
    ) {
      rotatedSubtreeRoot = this.singleRotate()
    }
    else {
      rotatedSubtreeRoot = this.doubleRotate()
    }

    rotatedSubtreeRoot.updateHeight()

    return rotatedSubtreeRoot
  }

  doubleRotate(): Node<T> {
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

  singleRotate(): Node<T> {
    assert(this.balance !== 0, 'singleRotate called on balanced node')
    const pivotNodeDirection = this.balance > 0
    const oppositeDirection = !pivotNodeDirection

    const heavyChild = this.branch(pivotNodeDirection)!

    this.setBranch(pivotNodeDirection, heavyChild.branch(oppositeDirection))
    heavyChild.setBranch(oppositeDirection, this)

    this.updateHeight()
    heavyChild.updateHeight()

    this.updateAttributes()
    heavyChild.updateAttributes()

    return heavyChild
  }

  public searchPoint(point: number, result: Interval<T>[]): void {
    if (point < this.minStart || point > this.maxEnd)
      return

    for (let i = 0; i < this.values.length; i++) {
      const v = this.values[i]
      if (v.start <= point && point < v.end)
        result.push(v)
    }

    const left = this._left
    if (left && point >= left.minStart)
      left.searchPoint(point, result)

    const right = this._right
    if (right && point <= right.maxEnd)
      right.searchPoint(point, result)
  }

  // print structure recursively, showing branches with extra spaces
  printStructure(indent = 0, prefix = '') {
    console.error(
      `${'  '.repeat(indent)
      }${prefix}Node(${this.values}, maxEnd=${this.maxEnd} height=${this.height} balance=${this.balance})`,
    )
    if (this._left)
      this._left.printStructure(indent + 1, '< ')

    if (this._right)
      this._right.printStructure(indent + 1, '> ')
  }

  public countIntervals(): number {
    let count = this.values.length
    const left = this._left
    const right = this._right
    if (left)
      count += left.countIntervals()
    if (right)
      count += right.countIntervals()
    return count
  }

  /** Return the leftmost (minimum start) node */
  public min(): Node<T> {
    const left = this._left
    return left ? left.min() : this
  }

  /** Return the rightmost (maximum start) node */
  public max(): Node<T> {
    const right = this._right
    return right ? right.max() : this
  }

  public toArray(result: Interval<T>[] = []): Interval<T>[] {
    // In-order traversal: left, self, right — produces sorted output
    const left = this._left
    if (left)
      left.toArray(result)
    for (let i = 0; i < this.values.length; i++)
      result.push(this.values[i])
    const right = this._right
    if (right)
      right.toArray(result)
    return result
  }

  public remove(interval: Interval<T>, rebalance: [boolean] = _rebalance): Node<T> | null {
    // Reset shared state on top-level call
    if (rebalance === _rebalance) {
      _rebalance[0] = false
      _flags.removeSucceeded = false
    }
    // eslint-disable-next-line ts/no-this-alias
    let result: Node<T> = this

    if (interval.start < this.start) {
      const left = this._left
      this._left = left?.remove(interval, rebalance) ?? null
    }
    else if (interval.start > this.start) {
      const right = this._right
      this._right = right?.remove(interval, rebalance) ?? null
    }
    else {
      // Found the node — remove the specific interval
      const values = this.values
      for (let i = 0; i < values.length; i++) {
        if (values[i].end === interval.end && values[i].data === interval.data) {
          values.splice(i, 1)
          _flags.removeSucceeded = true
          break
        }
      }

      if (values.length === 0) {
        rebalance[0] = true
        const left = this._left
        const right = this._right
        if (left && right) {
          // Find in-order successor
          let successor: Node<T> = right
          while (successor._left)
            successor = successor._left!

          successor = successor.clone()
          // Remove successor values from right subtree
          let rightNode: Node<T> | null = right
          for (const value of successor.values)
            rightNode = rightNode?.remove(value, rebalance) ?? null

          successor._left = left
          successor._right = rightNode
          result = successor
        }
        else {
          return left ?? right ?? null
        }
      }
    }
    result.updateAttributes()
    if (rebalance[0])
      return result.rotate()

    return result
  }

  public clone(): Node<T> {
    const node = new Node(this.values[0])
    node.values = this.values.slice()
    const left = this._left
    const right = this._right
    node._left = left?.clone() ?? null
    node._right = right?.clone() ?? null
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
    filterFn?: (iv: Interval<T>) => boolean,
  ): Interval<T> | undefined {
    if (this.maxEnd < startingAt || this.maxLength < minLength)
      return undefined

    // Check left subtree first (in-order — earliest start wins)
    const left = this._left
    if (left && left.maxEnd >= startingAt && left.maxLength >= minLength) {
      const found = left.findOneByLengthStartingAt(minLength, startingAt, filterFn)
      if (found)
        return found
    }

    // Check self
    for (let i = 0; i < this.values.length; i++) {
      const interval = this.values[i]
      if (interval.end < startingAt)
        continue
      if (interval.availableLength(startingAt) < minLength)
        continue
      if (filterFn && !filterFn(interval))
        continue
      return interval.start < startingAt
        ? new Interval(startingAt, interval.end, interval.data)
        : interval
    }

    // Check right subtree
    const right = this._right
    if (right && right.maxEnd >= startingAt && right.maxLength >= minLength) {
      return right.findOneByLengthStartingAt(minLength, startingAt, filterFn)
    }

    return undefined
  }

  public searchByLengthStartingAt(
    minLength: number,
    startingAt: number,
    result: Interval<T>[],
  ): Interval<T>[] {
    // Skip this entire subtree if it cannot contain a qualifying interval
    if (this.maxEnd < startingAt || this.maxLength < minLength)
      return result

    // In-order traversal: left, self, right — produces sorted output
    const left = this._left
    if (left && left.maxEnd >= startingAt && left.maxLength >= minLength)
      left.searchByLengthStartingAt(minLength, startingAt, result)

    for (let i = 0; i < this.values.length; i++) {
      const interval = this.values[i]
      if (interval.end < startingAt)
        continue
      if (interval.availableLength(startingAt) >= minLength) {
        result.push(interval.start < startingAt
          ? new Interval(startingAt, interval.end, interval.data)
          : interval)
      }
    }

    const right = this._right
    if (right && right.maxEnd >= startingAt && right.maxLength >= minLength)
      right.searchByLengthStartingAt(minLength, startingAt, result)
    return result
  }

  public searchOverlap(
    start: number,
    end: number,
    result: Interval<T>[] = [],
  ): Interval<T>[] {
    // In-order traversal: left, self, right
    const left = this._left
    if (left && start <= left.maxEnd)
      left.searchOverlap(start, end, result)

    // Check current node's intervals for overlap
    // Using strict inequalities for half-open interval semantics [start, end)
    for (let i = 0; i < this.values.length; i++) {
      const iv = this.values[i]
      if (iv.end > start && iv.start < end)
        result.push(iv)
    }

    // Traverse right subtree if it might contain overlapping intervals
    const right = this._right
    if (right && end >= right.minStart)
      right.searchOverlap(start, end, result)

    return result
  }

  public verify(): void {
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
    assert.strictEqual(
      this.start,
      this.values[0].start,
      `start incorrect (this.start=${this.start}, actual=${this.values[0].start})`,
    )

    // verify maxLength
    const actualMaxLength = this.calcMaxLength()
    assert(
      this.maxLength === actualMaxLength,
      `maxlength incorrect, this.maxLength=${this.maxLength}, actual=${actualMaxLength}`,
    )

    const actualMaxEnd = this.calcMaxEnd()
    assert(
      this.maxEnd === actualMaxEnd,
      `(${this.start}) maxEnd incorrect, this.maxEnd=${this.maxEnd}, actual=${actualMaxEnd}`,
    )

    // recursively verify branches
    if (this._left) {
      assert(
        this._left.start <= this.start,
        `(${this.start}) left child out of order (${this._left.start} < ${this.start})`,
      )
      this._left.verify()
    }

    if (this._right) {
      assert(
        this._right.start > this.start,
        `(${this.start}) right child out of order (${this._right.start} > ${this.start})`,
      )
      this._right.verify()
    }
  }

  public walkNodes(
    callback: (node: Node<T>, parent?: Node<T>, parentDir?: number) => void,
    parent?: Node<T>,
    parentDir?: number,
  ) {
    callback(this, parent, parentDir)
    this._left?.walkNodes(callback, this, 0)
    this._right?.walkNodes(callback, this, 1)
  }

  public reduceNodes<U>(
    callback: (accumulator: U, node: Node<T>) => U,
    initialValue: U,
  ): U {
    let accumulator = initialValue
    this.walkNodes((node) => {
      accumulator = callback(accumulator, node)
    })
    return accumulator
  }

  // can replace with walkNodes
  private calcMaxLength(): number {
    return Math.max(
      ...this.values.map(iv => iv.length),
      this._left?.calcMaxLength() ?? 0,
      this._right?.calcMaxLength() ?? 0,
    )
  }

  private calcMaxEnd(): number {
    return Math.max(
      ...this.values.map(iv => iv.end),
      this._left?.calcMaxEnd() ?? Number.NEGATIVE_INFINITY,
      this._right?.calcMaxEnd() ?? Number.NEGATIVE_INFINITY,
    )
  }

  /**
   * Update augmented attributes of the node.
   * @returns true if the attributes were updated, false otherwise.
   */
  private updateAttributes(): boolean {
    const oldMinStart = this.minStart
    const oldMaxEnd = this.maxEnd
    const oldMaxLength = this.maxLength

    // All values share the same start (tree invariant)
    // Only need to scan for maxEnd and maxLength
    let minStart = this.start
    let maxEnd = this.values[0].end
    let maxLength = maxEnd - this.start
    for (let i = 1; i < this.values.length; i++) {
      const e = this.values[i].end
      if (e > maxEnd)
        maxEnd = e
      const len = e - this.start
      if (len > maxLength)
        maxLength = len
    }

    // Incorporate children
    const left = this._left
    const right = this._right
    if (left) {
      if (left.minStart < minStart)
        minStart = left.minStart
      if (left.maxEnd > maxEnd)
        maxEnd = left.maxEnd
      if (left.maxLength > maxLength)
        maxLength = left.maxLength
    }
    if (right) {
      if (right.minStart < minStart)
        minStart = right.minStart
      if (right.maxEnd > maxEnd)
        maxEnd = right.maxEnd
      if (right.maxLength > maxLength)
        maxLength = right.maxLength
    }

    this.minStart = minStart
    this.maxEnd = maxEnd
    this.maxLength = maxLength

    return oldMinStart !== minStart
      || oldMaxEnd !== maxEnd
      || oldMaxLength !== maxLength
  }

  private updateHeight() {
    const lh = this._left?.height ?? 0
    const rh = this._right?.height ?? 0
    this.height = 1 + (lh > rh ? lh : rh)
  }
}
