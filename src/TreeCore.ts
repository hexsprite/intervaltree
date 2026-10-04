import { assert } from './assert'
import { compareIntervals } from './compareIntervals'
import { Interval } from './Interval'

interface Aggregates {
  height: number
  minStart: number
  maxEnd: number
  maxLength: number
  count: number
}

const LEFT = false
const RIGHT = true
type Direction = boolean

/**
 * Recursion scratch for one insert or remove. The return value carries the
 * new subtree root, so results travel here. Each TreeCore owns one, so a call
 * allocates nothing.
 */
interface MutationState {
  /** insert: an equal interval is already stored. remove: the interval was found and removed. */
  found: boolean
  /** insert: the subtree height stopped changing, so no ancestor needs to rebalance. */
  rebalancingDone: boolean
  /** insert: this subtree's augmentation changed, so the parent must recompute its own. */
  updateRequired: boolean
  /** remove: a node was unlinked, so every ancestor must rebalance. */
  rebalance: boolean
}

/**
 * One AVL node: every interval that shares a start, sorted by end, plus the
 * augmentation searches prune on. Private to this module; TreeCore is its only user.
 */
class Node<T = unknown> {
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

  /**
   * Builds a balanced subtree over indices [lo, hi] in O(n). `make(i)` returns
   * a leaf node with correct attributes for index i. An empty range gives null.
   */
  static build<T>(make: (i: number) => Node<T>, lo: number, hi: number): Node<T> | null {
    if (lo > hi)
      return null
    const mid = (lo + hi) >> 1
    const node = make(mid)
    if (lo < hi) {
      node._left = Node.build(make, lo, mid - 1)
      node._right = Node.build(make, mid + 1, hi)
      node.updateHeight()
      node.updateAttributes()
    }
    return node
  }

  /** A leaf node holding one same-start group, sorted by end. */
  static fromGroup<T>(values: Interval<T>[]): Node<T> {
    const node = new Node(values[0])
    if (values.length > 1) {
      node.values = values
      node.updateAttributes()
    }
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

  /** Returns the new subtree root. Sets `state.found` when an equal interval is already stored. */
  insert(interval: Interval<T>, state: MutationState): Node<T> {
    state.found = false
    state.rebalancingDone = false
    state.updateRequired = false
    return this._insert(interval, state)
  }

  private _insert(interval: Interval<T>, state: MutationState): Node<T> {
    // if the interval starts at the same point as this node, add it to the values
    if (this.start === interval.start) {
      // don't add a duplicate with the same start, end, and data reference
      for (let i = 0; i < this.values.length; i++) {
        if (this.values[i].equals(interval)) {
          state.found = true
          return this
        }
      }

      // Keep values sorted by end so in-order traversal is canonical (start, end).
      let pos = this.values.length
      while (pos > 0 && this.values[pos - 1].end > interval.end)
        pos--
      this.values.splice(pos, 0, interval)
      // no rebalancing needed because the height of this node doesn't change
      state.rebalancingDone = true
      state.updateRequired = this.updateAttributes()

      return this
    }

    // search for the correct branch to insert the interval
    const dir = this.start < interval.start ? RIGHT : LEFT
    const branchNode = dir === RIGHT ? this._right : this._left

    if (branchNode) {
      const inserted = branchNode._insert(interval, state)
      if (dir === RIGHT)
        this._right = inserted
      else this._left = inserted
      if (state.updateRequired)
        this.updateAttributes()
    }
    else {
      const newNode = new Node(interval)
      if (dir === RIGHT)
        this._right = newNode
      else this._left = newNode
      state.updateRequired = this.updateAttributes()
    }

    if (!state.rebalancingDone) {
      this.updateHeight()
      if (this.balance === 0) {
        state.rebalancingDone = true
        return this
      }
      else if (Math.abs(this.balance) > 1) {
        state.rebalancingDone = true
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

  /** Whether any interval in this subtree contains `point`. Mirrors searchPoint's prune conditions but short-circuits on the first hit. */
  public hasPoint(point: number): boolean {
    if (point < this.minStart || point > this.maxEnd)
      return false

    for (let i = 0; i < this.values.length; i++) {
      const v = this.values[i]
      if (v.start <= point && point < v.end)
        return true
    }

    const left = this._left
    if (left && point >= left.minStart && left.hasPoint(point))
      return true

    const right = this._right
    if (right && point <= right.maxEnd && right.hasPoint(point))
      return true

    return false
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

  /** Returns the new subtree root. Sets `state.found` when the interval was stored and is now gone. */
  public remove(interval: Interval<T>, state: MutationState): Node<T> | null {
    state.found = false
    state.rebalance = false
    return this._remove(interval, state)
  }

  private _remove(interval: Interval<T>, state: MutationState): Node<T> | null {
    // eslint-disable-next-line ts/no-this-alias
    let result: Node<T> = this

    if (interval.start < this.start) {
      const left = this._left
      this._left = left?._remove(interval, state) ?? null
    }
    else if (interval.start > this.start) {
      const right = this._right
      this._right = right?._remove(interval, state) ?? null
    }
    else {
      // Found the node — remove the specific interval
      const values = this.values
      for (let i = 0; i < values.length; i++) {
        if (values[i].end === interval.end && values[i].data === interval.data) {
          values.splice(i, 1)
          state.found = true
          break
        }
      }

      if (values.length === 0) {
        state.rebalance = true
        const left = this._left
        const right = this._right
        if (left && right) {
          // Move the in-order successor node into this position, values and all.
          const successor = right.min()
          successor._right = right._removeMin()
          successor._left = left
          successor.updateHeight()
          result = successor
        }
        else {
          return left ?? right ?? null
        }
      }
    }
    result.updateAttributes()
    if (state.rebalance)
      return result.rotate()

    return result
  }

  /** Unlinks the leftmost node of this subtree and returns the rebalanced subtree root. */
  private _removeMin(): Node<T> | null {
    const left = this._left
    if (!left)
      return this._right
    this._left = left._removeMin()
    this.updateAttributes()
    return this.rotate()
  }

  public clone(): Node<T> {
    const node = new Node(this.values[0])
    node.values = this.values.slice()
    const left = this._left
    const right = this._right
    node._left = left?.clone() ?? null
    node._right = right?.clone() ?? null
    // The source tree is already consistent, so copy the augmentation
    // instead of recomputing it from values and children at every node.
    node.height = this.height
    node.minStart = this.minStart
    node.maxEnd = this.maxEnd
    node.maxLength = this.maxLength
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

    // in-order by original start; IntervalTree sorts after clipping
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

  /** Whether any interval in this subtree overlaps [start, end). Mirrors searchOverlap's prune conditions but short-circuits on the first hit. */
  public hasOverlap(start: number, end: number): boolean {
    const left = this._left
    if (left && start <= left.maxEnd && left.hasOverlap(start, end))
      return true

    for (let i = 0; i < this.values.length; i++) {
      const iv = this.values[i]
      if (iv.end > start && iv.start < end)
        return true
    }

    const right = this._right
    if (right && end >= right.minStart && right.hasOverlap(start, end))
      return true

    return false
  }

  /**
   * Collect intervals fully enveloped by [qs, qe] — `iv.start >= qs && iv.end <= qe`.
   * Pruning rules (qs/qe fixed, this is the recursive subtree):
   *   - Whole subtree enveloped: `minStart >= qs && maxEnd <= qe` → emit toArray.
   *   - Skip left iff `this.start <= qs` (BST: left starts < this.start ≤ qs ⇒ iv.start < qs)
   *     or `left.maxEnd <= qs` (left ends ≤ qs and iv.start ≤ iv.end ≤ qs forces non-envelopment).
   *   - Self contributes only when `this.start >= qs` (all values share this.start).
   *   - Skip right iff `right.minStart >= qe` (iv.start ≥ qe ⇒ iv.end > qe ⇒ not enveloped).
   */
  public searchEnveloped(qs: number, qe: number, result: Interval<T>[]): Interval<T>[] {
    if (this.minStart >= qs && this.maxEnd <= qe)
      return this.toArray(result)

    const left = this._left
    if (left && this.start > qs && left.maxEnd > qs)
      left.searchEnveloped(qs, qe, result)

    if (this.start >= qs) {
      const values = this.values
      for (let i = 0; i < values.length; i++) {
        const iv = values[i]
        if (iv.end <= qe)
          result.push(iv)
      }
    }

    const right = this._right
    if (right && right.minStart < qe)
      right.searchEnveloped(qs, qe, result)

    return result
  }

  /**
   * Inverse of searchEnveloped: collect intervals NOT enveloped by [qs, qe], in-order.
   * Whole-subtree envelopment lets us skip dense regions in O(1).
   */
  public collectNonEnveloped(qs: number, qe: number, result: Interval<T>[]): Interval<T>[] {
    if (this.minStart >= qs && this.maxEnd <= qe)
      return result

    const left = this._left
    if (left)
      left.collectNonEnveloped(qs, qe, result)

    if (this.start < qs) {
      const values = this.values
      for (let i = 0; i < values.length; i++)
        result.push(values[i])
    }
    else {
      const values = this.values
      for (let i = 0; i < values.length; i++) {
        const iv = values[i]
        if (iv.end > qe)
          result.push(iv)
      }
    }

    const right = this._right
    if (right)
      right.collectNonEnveloped(qs, qe, result)

    return result
  }

  /**
   * Check every node invariant against values recomputed from the subtree.
   * Read-only: it never repairs a field. Throws on the first violation. O(n).
   * @returns the number of intervals in the subtree.
   */
  public verify(): number {
    return this.verifySubtree(Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY).count
  }

  /** Verifies the subtree, whose starts must lie strictly between `lo` and `hi`. */
  private verifySubtree(lo: number, hi: number): Aggregates {
    const where = `(start=${this.start})`
    assert(this.values.length > 0, `${where} node holds no intervals`)
    assert(
      this.start > lo && this.start < hi,
      `${where} out of order: start must lie in (${lo}, ${hi})`,
    )

    // Every value shares the node's start and the values sort by end.
    let maxEnd = Number.NEGATIVE_INFINITY
    let maxLength = 0
    for (let i = 0; i < this.values.length; i++) {
      const iv = this.values[i]
      assert(iv.start === this.start, `${where} different start values: ${iv.start}`)
      if (i > 0) {
        assert(
          this.values[i - 1].end <= iv.end,
          `${where} values not sorted by end`,
        )
      }
      if (iv.end > maxEnd)
        maxEnd = iv.end
      if (iv.length > maxLength)
        maxLength = iv.length
    }
    let minStart = this.start
    let count = this.values.length

    let leftHeight = 0
    let rightHeight = 0
    if (this._left) {
      const l = this._left.verifySubtree(lo, this.start)
      leftHeight = l.height
      minStart = Math.min(minStart, l.minStart)
      maxEnd = Math.max(maxEnd, l.maxEnd)
      maxLength = Math.max(maxLength, l.maxLength)
      count += l.count
    }
    if (this._right) {
      const r = this._right.verifySubtree(this.start, hi)
      rightHeight = r.height
      minStart = Math.min(minStart, r.minStart)
      maxEnd = Math.max(maxEnd, r.maxEnd)
      maxLength = Math.max(maxLength, r.maxLength)
      count += r.count
    }

    const height = 1 + Math.max(leftHeight, rightHeight)
    assert(
      this.height === height,
      `${where} height incorrect, stored=${this.height}, actual=${height}`,
    )
    // Balance uses the verified child heights, so it cannot pass by accident.
    const balance = rightHeight - leftHeight
    assert(
      Math.abs(balance) < 2,
      `${where} unbalanced: balance=${balance} (left height ${leftHeight}, right height ${rightHeight})`,
    )
    assert(
      this.minStart === minStart,
      `${where} minStart incorrect, stored=${this.minStart}, actual=${minStart}`,
    )
    assert(
      this.maxEnd === maxEnd,
      `${where} maxEnd incorrect, stored=${this.maxEnd}, actual=${maxEnd}`,
    )
    assert(
      this.maxLength === maxLength,
      `${where} maxLength incorrect, stored=${this.maxLength}, actual=${maxLength}`,
    )
    return { height, minStart, maxEnd, maxLength, count }
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

/** Groups sorted intervals by start and drops repeats of the same start, end, and data. */
function groupByStart<T>(sorted: readonly Interval<T>[]): Interval<T>[][] {
  const groups: Interval<T>[][] = []
  let i = 0
  while (i < sorted.length) {
    const s = sorted[i].start
    const values: Interval<T>[] = [sorted[i]]
    const byEnd = new Map<number, Interval<T>[]>([[sorted[i].end, [sorted[i]]]])
    i++
    while (i < sorted.length && sorted[i].start === s) {
      const bucket = byEnd.get(sorted[i].end)
      if (!bucket) {
        byEnd.set(sorted[i].end, [sorted[i]])
        values.push(sorted[i])
      }
      else if (!bucket.some(iv => iv.data === sorted[i].data)) {
        bucket.push(sorted[i])
        values.push(sorted[i])
      }
      i++
    }
    groups.push(values)
  }
  return groups
}

/**
 * The augmented AVL tree: owns the root node and the interval count.
 * It stores intervals and answers searches; policy such as merging lives in IntervalTree.
 */
export class TreeCore<T> {
  private root: Node<T> | null
  private _size: number
  private readonly state: MutationState = { found: false, rebalancingDone: false, updateRequired: false, rebalance: false }

  private constructor(root: Node<T> | null, size: number) {
    this.root = root
    this._size = size
  }

  /** Sorts, groups by start, and drops duplicates. Empty input gives an empty core. */
  static from<T>(intervals: readonly Interval<T>[]): TreeCore<T> {
    if (intervals.length === 0)
      return new TreeCore<T>(null, 0)
    const groups = groupByStart(intervals.toSorted(compareIntervals))
    let size = 0
    for (let i = 0; i < groups.length; i++)
      size += groups[i].length
    return new TreeCore(Node.build(i => Node.fromGroup(groups[i]), 0, groups.length - 1), size)
  }

  /**
   * Builds in O(n) without sorting or grouping. The caller guarantees input
   * sorted by start with distinct starts; nothing checks it here.
   */
  static fromSortedDistinctStarts<T>(sorted: readonly Interval<T>[]): TreeCore<T> {
    return new TreeCore(Node.build(i => new Node(sorted[i]), 0, sorted.length - 1), sorted.length)
  }

  get size(): number {
    return this._size
  }

  get isEmpty(): boolean {
    return this.root === null
  }

  /** @returns false when an interval with the same start, end, and data is already stored. */
  insert(interval: Interval<T>): boolean {
    if (!this.root) {
      this.root = new Node(interval)
      this._size = 1
      return true
    }
    this.root = this.root.insert(interval, this.state)
    if (this.state.found)
      return false
    this._size++
    return true
  }

  /** @returns false when no interval with the same start, end, and data is stored. */
  remove(interval: Interval<T>): boolean {
    if (!this.root)
      return false
    this.root = this.root.remove(interval, this.state)
    if (!this.state.found)
      return false
    this._size--
    return true
  }

  /** The interval with the smallest (start, end), or null if empty. O(log n). */
  first(): Interval<T> | null {
    return this.root ? this.root.min().values[0] : null
  }

  /** The interval with the largest (start, end), or null if empty. O(log n). */
  last(): Interval<T> | null {
    if (!this.root)
      return null
    const values = this.root.max().values
    return values[values.length - 1]
  }

  /** In order by start, then end, then insertion order. */
  toArray(): Interval<T>[] {
    return this.root ? this.root.toArray() : []
  }

  searchPoint(point: number): Interval<T>[] {
    const result: Interval<T>[] = []
    this.root?.searchPoint(point, result)
    return result
  }

  hasPoint(point: number): boolean {
    return this.root ? this.root.hasPoint(point) : false
  }

  searchOverlap(start: number, end: number): Interval<T>[] {
    return this.root ? this.root.searchOverlap(start, end, []) : []
  }

  hasOverlap(start: number, end: number): boolean {
    return this.root ? this.root.hasOverlap(start, end) : false
  }

  /** Intervals with `start >= qs && end <= qe`, in order. */
  searchEnveloped(qs: number, qe: number): Interval<T>[] {
    return this.root ? this.root.searchEnveloped(qs, qe, []) : []
  }

  /** Every interval searchEnveloped(qs, qe) leaves out, in order. */
  collectNonEnveloped(qs: number, qe: number): Interval<T>[] {
    return this.root ? this.root.collectNonEnveloped(qs, qe, []) : []
  }

  findOneByLengthStartingAt(
    minLength: number,
    startingAt: number,
    filterFn?: (iv: Interval<T>) => boolean,
  ): Interval<T> | undefined {
    return this.root?.findOneByLengthStartingAt(minLength, startingAt, filterFn)
  }

  /** In order by original start, so clipping to `startingAt` can leave ties unsorted. */
  searchByLengthStartingAt(minLength: number, startingAt: number): Interval<T>[] {
    return this.root ? this.root.searchByLengthStartingAt(minLength, startingAt, []) : []
  }

  clone(): TreeCore<T> {
    return new TreeCore(this.root?.clone() ?? null, this._size)
  }

  printStructure(): void {
    if (!this.root) {
      console.error('IntervalTree(<empty>)')
      return
    }
    this.root.printStructure()
  }

  /**
   * Checks every AVL and augmentation invariant and the cached size.
   * Read-only. Throws on the first violation. O(n).
   */
  verify(): void {
    if (!this.root) {
      assert(this._size === 0, `size is ${this._size} but the tree is empty`)
      return
    }
    const count = this.root.verify()
    assert(
      this._size === count,
      `size is ${this._size} but the tree holds ${count} intervals`,
    )
  }
}
