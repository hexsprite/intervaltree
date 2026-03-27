import { strict as assert } from 'node:assert'
import { compareIntervals } from './compareIntervals'
import { Interval } from './Interval'

const LEFT = 0
const RIGHT = 1
type Direction = 0 | 1 | true | false

// const debug = (...args: any[]) => console.log(...args)

// Shared mutable flags to avoid allocating [boolean] arrays per insert call
const _rebalancingDone = [false]
const _updateRequired = [false]
/** Set to true by insert() when a duplicate was detected and nothing was added */
export let _insertWasDuplicate = false
/** Set to true by remove() when the interval was actually found and removed */
export let _removeSucceeded = false

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

  private get left() {
    return this._left
  }

  private get right() {
    return this._right
  }

  private set left(node: Node<T> | null) {
    this._left = node
  }

  private set right(node: Node<T> | null) {
    this._right = node
  }

  static fromIntervals<T>(intervals: Interval<T>[]): Node<T> {
    assert(intervals.length > 0, 'Error: intervals must not be empty')
    const sorted = intervals.toSorted(compareIntervals)
    // Group same-start intervals and dedup, then build balanced tree from groups
    const groups = Node._groupByStart(sorted)
    return Node._buildFromGroups(groups, 0, groups.length - 1)
  }

  /** Like fromIntervals but skips sorting — caller guarantees sorted input. */
  static fromSortedIntervals<T>(sorted: Interval<T>[]): Node<T> {
    assert(sorted.length > 0, 'Error: intervals must not be empty')
    const groups = Node._groupByStart(sorted)
    return Node._buildFromGroups(groups, 0, groups.length - 1)
  }

  /** Group sorted intervals by start, deduplicating same start+end. */
  private static _groupByStart<T>(sorted: Interval<T>[]): Array<{ start: number, values: Interval<T>[] }> {
    const groups: Array<{ start: number, values: Interval<T>[] }> = []
    let i = 0
    while (i < sorted.length) {
      const s = sorted[i].start
      const values: Interval<T>[] = [sorted[i]]
      i++
      while (i < sorted.length && sorted[i].start === s) {
        // Dedup by end
        if (!values.some(v => v.end === sorted[i].end))
          values.push(sorted[i])
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
  private static _buildFromGroups<T>(groups: Array<{ start: number, values: Interval<T>[] }>, lo: number, hi: number): Node<T> {
    if (lo === hi) {
      const g = groups[lo]
      const node = new Node(g.values[0])
      for (let i = 1; i < g.values.length; i++)
        node.values.push(g.values[i])
      node.updateAttributes()
      return node
    }
    if (lo + 1 === hi) {
      const node = new Node(groups[lo].values[0])
      for (let i = 1; i < groups[lo].values.length; i++)
        node.values.push(groups[lo].values[i])
      const right = new Node(groups[hi].values[0])
      for (let i = 1; i < groups[hi].values.length; i++)
        right.values.push(groups[hi].values[i])
      node._right = right
      right.updateAttributes()
      node.height = 2
      node.updateAttributes()
      return node
    }

    const mid = (lo + hi) >> 1
    const g = groups[mid]
    const node = new Node(g.values[0])
    for (let i = 1; i < g.values.length; i++)
      node.values.push(g.values[i])

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
    if (direction) this._right = node; else this._left = node
  }

  insert(interval: Interval<T>, rebalancingDone: [boolean] = (_rebalancingDone[0] = false, _insertWasDuplicate = false, _rebalancingDone), updateRequired: [boolean] = (_updateRequired[0] = false, _updateRequired)): Node<T> {
    // if the interval starts at the same point as this node, add it to the values
    if (this.start === interval.start) {
      // don't add a duplicate
      const end = interval.end
      for (let i = 0; i < this.values.length; i++) {
        if (this.values[i].end === end) {
          _insertWasDuplicate = true
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
      if (dir === RIGHT) this._right = inserted; else this._left = inserted
      if (updateRequired[0])
        this.updateAttributes()
    }
    else {
      const newNode = new Node(interval)
      if (dir === RIGHT) this._right = newNode; else this._left = newNode
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

  public searchPoint(point: number, result: Interval<T>[]) {
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
    if (this.left)
      this.left.printStructure(indent + 1, (prefix = '< '))

    if (this.right)
      this.right.printStructure(indent + 1, (prefix = '> '))
  }

  public countIntervals(): number {
    let count = this.values.length
    const left = this._left
    const right = this._right
    if (left) count += left.countIntervals()
    if (right) count += right.countIntervals()
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
    if (left) left.toArray(result)
    for (let i = 0; i < this.values.length; i++)
      result.push(this.values[i])
    const right = this._right
    if (right) right.toArray(result)
    return result
  }

  public remove(interval: Interval<T>, rebalance: [boolean] = (_removeSucceeded = false, [false])): Node<T> | null {
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
          _removeSucceeded = true
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
    filterFn: (iv: Interval<T>) => boolean = () => true,
  ): Interval<T> | undefined {
    // Skip this branch if it cannot contain a qualifying interval
    if (this.shouldSkipBranch(minLength, startingAt))
      return

    // Find best (earliest start, smallest end) among eligible intervals
    let best: Interval<T> | undefined

    for (let i = 0; i < this.values.length; i++) {
      const iv = this.values[i]
      if (iv.end < startingAt) continue
      const adjustedLength = iv.end - iv.start - Math.max(0, startingAt - iv.start)
      if (adjustedLength < minLength) continue
      if (!filterFn(iv)) continue
      if (!best || iv.start < best.start || (iv.start === best.start && iv.end < best.end))
        best = iv
    }

    // Check children
    const leftCandidate = this._left?.findOneByLengthStartingAt(minLength, startingAt, filterFn)
    if (leftCandidate && (!best || leftCandidate.start < best.start || (leftCandidate.start === best.start && leftCandidate.end < best.end)))
      best = leftCandidate

    const rightCandidate = this._right?.findOneByLengthStartingAt(minLength, startingAt, filterFn)
    if (rightCandidate && (!best || rightCandidate.start < best.start || (rightCandidate.start === best.start && rightCandidate.end < best.end)))
      best = rightCandidate

    return best
  }

  public searchByLengthStartingAt(
    minLength: number,
    startingAt: number,
    result: Interval<T>[],
  ) {
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
      const adjustedLength
        = interval.end - interval.start - Math.max(0, startingAt - interval.start)
      if (adjustedLength >= minLength) {
        result.push(interval.start < startingAt
          ? new Interval(startingAt, interval.end)
          : interval)
      }
    }

    const right = this._right
    if (right && right.maxEnd >= startingAt && right.maxLength >= minLength)
      right.searchByLengthStartingAt(minLength, startingAt, result)
    return result
  }

  /**
   * Find the first interval (in sorted order) that meets the length and start criteria.
   * Uses in-order traversal with early termination — O(log n) best case.
   */
  public findFirstByLengthStartingAt(
    minLength: number,
    startingAt: number,
  ): Interval<T> | undefined {
    if (this.maxEnd < startingAt || this.maxLength < minLength)
      return undefined

    // Check left subtree first (in-order)
    const left = this._left
    if (left && left.maxEnd >= startingAt && left.maxLength >= minLength) {
      const found = left.findFirstByLengthStartingAt(minLength, startingAt)
      if (found) return found
    }

    // Check self
    for (let i = 0; i < this.values.length; i++) {
      const interval = this.values[i]
      if (interval.end < startingAt) continue
      const adjustedLength
        = interval.end - interval.start - Math.max(0, startingAt - interval.start)
      if (adjustedLength >= minLength) {
        return interval.start < startingAt
          ? new Interval(startingAt, interval.end)
          : interval
      }
    }

    // Check right subtree
    const right = this._right
    if (right && right.maxEnd >= startingAt && right.maxLength >= minLength) {
      return right.findFirstByLengthStartingAt(minLength, startingAt)
    }

    return undefined
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

  public verify(parents: Set<number> = new Set()) {
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

  public walkNodes(
    callback: (node: Node<T>, parent?: Node<T>, parentDir?: number) => void,
    parent?: Node<T>,
    parentDir?: number,
  ) {
    callback(this, parent, parentDir)
    this.left?.walkNodes(callback, this, 0)
    this.right?.walkNodes(callback, this, 1)
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
      this.left?.calcMaxLength() ?? 0,
      this.right?.calcMaxLength() ?? 0,
    )
  }

  private calcMaxEnd(): number {
    return Math.max(
      ...this.values.map(iv => iv.end),
      this.left?.calcMaxEnd() ?? Number.NEGATIVE_INFINITY,
      this.right?.calcMaxEnd() ?? Number.NEGATIVE_INFINITY,
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
      if (e > maxEnd) maxEnd = e
      const len = e - this.start
      if (len > maxLength) maxLength = len
    }

    // Incorporate children
    const left = this._left
    const right = this._right
    if (left) {
      if (left.minStart < minStart) minStart = left.minStart
      if (left.maxEnd > maxEnd) maxEnd = left.maxEnd
      if (left.maxLength > maxLength) maxLength = left.maxLength
    }
    if (right) {
      if (right.minStart < minStart) minStart = right.minStart
      if (right.maxEnd > maxEnd) maxEnd = right.maxEnd
      if (right.maxLength > maxLength) maxLength = right.maxLength
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
