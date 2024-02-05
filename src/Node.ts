/* eslint-disable @typescript-eslint/member-ordering */
import assert from 'assert'

import { Interval } from './Interval'
import { compareIntervals } from './IntervalSortedSet'
import { IntervalHashSet } from './IntervalHashSet'
import { debug, logger } from './debug'
import _ from 'lodash'

export class Node {
  public maxLength = 0
  public maxStart = 0
  private xCenter: number
  private sCenter: IntervalHashSet
  private leftNode: Node | null = null
  private rightNode: Node | null = null
  private depth: number
  private balance: number
  /** Maximum length of Intervals in this Node */

  public constructor(
    xCenter: number,
    sCenter: Interval[] | IntervalHashSet,
    leftNode: Node | null = null,
    rightNode: Node | null = null,
    rotate = true,
    depth = 0,
    balance = 0
  ) {
    this.xCenter = xCenter
    this.sCenter = Array.isArray(sCenter)
      ? new IntervalHashSet(sCenter)
      : new IntervalHashSet(sCenter.toArray())
    this.leftNode = leftNode ?? null
    this.rightNode = rightNode ?? null
    // depth & balance are set when rotated
    this.depth = depth
    this.balance = balance
    if (rotate) this.rotate()
    this.updateNodeAttributes()
  }

  private get logger() {
    return logger.child({
      type: 'node',
      xCenter: this.xCenter,
    })
  }

  public static fromInterval(interval: Interval) {
    return new Node(interval.start, [interval])
  }

  public static fromIntervals(intervals: Interval[]): Node | null {
    if (intervals.length < 1) {
      return null
    }
    const sortedIntervals = [...intervals].sort(compareIntervals)
    return this.fromSortedIntervals(sortedIntervals)
  }

  public static fromSortedIntervals(intervals: Interval[]): Node | null {
    if (intervals.length < 1) {
      return null
    }
    const centerIv = intervals[Math.floor(intervals.length / 2)]
    // debug('centerIv', centerIv.toString())
    // debug('*** INTERVALS', intervals)
    const node = new Node(centerIv.start, [])
    const sLeft: Interval[] = []
    const sRight: Interval[] = []
    for (const iv of intervals) {
      if (iv.end <= node.xCenter) {
        sLeft.push(iv)
      } else if (iv.start > node.xCenter) {
        sRight.push(iv)
      } else {
        node.sCenter.add(iv)
      }
    }
    node.leftNode = Node.fromSortedIntervals(sLeft)
    node.rightNode = Node.fromSortedIntervals(sRight)
    node.updateNodeAttributes()

    return node.rotate()
  }

  public clone(): Node {
    function nodeCloner(node: Node | null) {
      return node ? node.clone() : node
    }
    return new Node(
      this.xCenter,
      this.sCenter,
      nodeCloner(this.leftNode),
      nodeCloner(this.rightNode),
      false,
      this.depth,
      this.balance
    )
  }

  public centerHit(interval: Interval) {
    // Returns whether interval overlaps this.xCenter
    return interval.containsPoint(this.xCenter)
  }

  public refreshBalance() {
    // Recalculate balance and depth based on child node values.
    const leftDepth = this.leftNode?.depth ?? 0
    const rightDepth = this.rightNode?.depth ?? 0
    this.depth = 1 + Math.max(leftDepth, rightDepth)
    this.balance = rightDepth - leftDepth
    // debug(
    //   `refreshBalance: leftDepth=${leftDepth} rightDepth=${rightDepth} balance=${this.balance}`,
    //   this.toString()
    // )
  }

  /**
   * Rotates, if necessary, to balance this node.
   * Returns new top node
   */
  public rotate(): Node {
    this.refreshBalance()
    if (Math.abs(this.balance) < 2) {
      // debug(
      //   `rotate: node xCenter=${this.xCenter} is balanced, no rotation needed`
      // )
      return this
    }

    // Determine the imbalance direction of pivotNode
    const pivotNodeDirection = this.balance > 0
    const heavyChildDirection = this.getBranch(pivotNodeDirection).balance > 0 // true for right, false for left

    // debug(
    //   `rotate: pivotNodeDirection=${branchStr(
    //     pivotNodeDirection
    //   )} heavyChildDirection=${branchStr(heavyChildDirection)} this.balance=${
    //     this.balance
    //   }`
    // )

    let rotatedSubtreeRoot: Node
    if (
      pivotNodeDirection === heavyChildDirection ||
      this.getBranch(pivotNodeDirection).balance === 0
    ) {
      // debug(
      //   'Imbalance in the same direction or heavyChild is balanced: single rotation needed'
      // )
      rotatedSubtreeRoot = this.singleRotate()
    } else {
      // debug('Imbalance in opposite directions: double rotation needed')
      rotatedSubtreeRoot = this.doubleRotate()
    }

    rotatedSubtreeRoot.verify()
    rotatedSubtreeRoot.updateNodeAttributes()

    return rotatedSubtreeRoot
  }

  public hitBranch(interval: Interval) {
    // Assuming not centerHit(interval), return which branch
    // (left=0, right=1) interval is in.
    return interval.start > this.xCenter
  }

  public getBranch(branch: boolean | number): Node {
    if (branch) {
      return this.rightNode! // FIXME: type safety
    } else {
      return this.leftNode!
    }
  }

  public setBranch(branch: boolean | number, node: Node) {
    if (branch) {
      this.rightNode = node
    } else {
      this.leftNode = node
    }
  }

  public add(interval: Interval) {
    // debug('add', interval.toString())
    // debug(JSON.stringify(this.toJSON()))
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let result: Node = this
    if (this.centerHit(interval)) {
      // this.logger.info('add: on center')
      this.sCenter.add(interval)
    } else {
      const direction = this.hitBranch(interval)
      const branchNode = this.getBranch(direction)
      // this.logger.info({ interval, direction }, 'add: on branch')
      if (!this.getBranch(direction)) {
        // this.logger.info({ interval }, 'new branch')
        this.setBranch(direction, Node.fromInterval(interval))
      } else {
        this.setBranch(direction, branchNode.add(interval))
        // this.logger.info('existing branch, rotating')
        result = this.rotate()
      }
    }
    result.refreshBalance()
    result.updateNodeAttributes()
    // result.verify() -- may fail because node might still need further rotation
    // this.logger.info({ interval }, 'add: done')
    // result.printStructure()
    return result
  }

  public printStructure(indent = 0, tostring = false): string | undefined {
    const spaces = '   '.repeat(indent)
    let result = ''

    const logit = (s: string) => (result += spaces + s + '\n')

    result += this.toString() + '\n'

    if (this.sCenter.size) {
      logit(`- [${this.sCenter.toArray()}]`)
    }
    if (this.leftNode) {
      logit(`<: ${this.leftNode.printStructure(indent + 1, true)}`)
    }
    if (this.rightNode) {
      logit(`>: ${this.rightNode.printStructure(indent + 1, true)}`)
    }
    if (tostring) {
      return result
    } else {
      debug('printStructure\n' + result)
    }
  }

  public toString() {
    return `Node(${this.xCenter}, depth=${this.depth}, balance=${this.balance}, maxLength=${this.maxLength}, maxStart=${this.maxStart})`
  }

  public searchPoint(point: number, result: Interval[]) {
    // Returns all intervals that contain point.
    // debug(`${this.toString()} searchPoint: searching ${point}`)
    this.sCenter
      .filter((interval) => interval.start <= point && point < interval.end)
      .forEach((interval) => result.push(interval))
    if (point < this.xCenter && this.getBranch(0)) {
      this.getBranch(0).searchPoint(point, result)
    } else if (point > this.xCenter && this.getBranch(1)) {
      this.getBranch(1).searchPoint(point, result)
    }
    return result
  }

  public searchByLengthStartingAt(
    minLength: number,
    startingAt: number,
    result: Interval[]
  ) {
    // Skip this branch if it cannot contain a qualifying interval
    // debug(
    //   `${this.toString()} searchPoint: searching minLength=${minLength} startingAt=${startingAt} maxLen=${
    //     this.maxLength
    //   }`
    // )
    const adjustedMinStart =
      startingAt + Math.max(0, minLength - this.maxLength)
    if (this.maxStart < adjustedMinStart) {
      // debug(
      //   `${this.toString()} searchPoint: maxStart skipping subtree (maxStart=${
      //     this.maxStart
      //   } adjustedMinStart=${adjustedMinStart})`
      // )
      return result // Skip this subtree
    } else if (this.maxLength < minLength) {
      // debug(`${this.toString()} searchPoint: maxLength skipping subtree`)
      return result // Skip this subtree
    }
    // search intervals that start at startingAt
    // debug(
    //   `${this.toString()} searchPoint: searching startingAt=${startingAt} xCenter=${
    //     this.xCenter
    //   }`
    // )
    this.sCenter.forEach((interval) => {
      // FIXME: use adjusted start and length
      const adjustedStart =
        interval.start + Math.max(0, interval.length - minLength)
      const adjustedLength =
        interval.length - Math.max(0, startingAt - adjustedMinStart)
      // debug(
      //   `comparing ${interval}, aStart=${adjustedStart} >= startingAt=${startingAt}, aLength=${adjustedLength} >= minLength=${minLength}`
      // )
      if (adjustedStart >= startingAt && adjustedLength >= minLength) {
        if (interval.start < startingAt) {
          // debug(`adjusted start from ${interval.start} to ${startingAt}`)
          interval = new Interval(startingAt, interval.end)
        }
        result.push(interval)
      }
    })

    this.getBranch(0)?.searchByLengthStartingAt(minLength, startingAt, result)
    this.getBranch(1)?.searchByLengthStartingAt(minLength, startingAt, result)
    return result
  }

  /**
   * Finds the first interval that meets the specified length and starting
   * position criteria.
   * If the interval actually starts before the specified starting position,
   * the returned interval is adjusted to start at the specified position.
   *
   * @param minLength The minimum length of the interval.
   * @param startingAt The starting position of the interval.
   * @returns The first interval that meets the criteria, or undefined if no
   *          interval is found.
   */
  public findFirstIntervalByLengthStartingAt(
    minLength: number,
    startingAt: number
  ): Interval | undefined {
    // debug(
    //   `${this.toString()} searchPoint: searching minLength=${minLength} startingAt=${startingAt} maxLen=${
    //     this.maxLength
    //   }`
    // )
    // Skip this branch if it cannot contain a qualifying interval
    const adjustedMinStart =
      startingAt + Math.max(0, minLength - this.maxLength)
    if (this.maxStart < adjustedMinStart) {
      // debug(
      //   `${this.toString()} searchPoint: maxStart skipping subtree (maxStart=${
      //     this.maxStart
      //   } adjustedMinStart=${adjustedMinStart})`
      // )
      return // Skip this subtree
    } else if (this.maxLength < minLength) {
      // debug(`${this.toString()} searchPoint: maxLength skipping subtree`)
      return // Skip this subtree
    }

    // search intervals that start at startingAt
    // debug(
    //   `${this.toString()} searchPoint: searching startingAt=${startingAt} xCenter=${
    //     this.xCenter
    //   }`
    // )

    const found = this.sCenter.toSorted(compareIntervals).find((interval) => {
      const overlaps =
        interval.start <= startingAt && interval.end >= startingAt
      if (!overlaps) {
        return
      }
      const adjustedLength =
        interval.length - Math.max(0, startingAt - interval.start)
      // debug(
      //   `comparing ${interval}, start=${interval.start} >= startingAt=${startingAt}, aLength=${adjustedLength} >= minLength=${minLength}`
      // )
      return adjustedLength >= minLength
    })

    // check other branches, and return the earliest interval found
    const left = this.getBranch(0)?.findFirstIntervalByLengthStartingAt(
      minLength,
      startingAt
    )
    const right = this.getBranch(1)?.findFirstIntervalByLengthStartingAt(
      minLength,
      startingAt
    )
    // should return the earliest interval found considering both start and end
    return _.minBy(
      [found, left, right],
      (interval) => interval?.start ?? Infinity
    )
  }

  public searchOverlap(pointList: number[]): Interval[] {
    const result = []
    for (const point of pointList) {
      this.searchPoint(point, result)
    }
    return result
  }

  public remove(interval: Interval): Node {
    /*
    Returns self after removing the interval and balancing.
    If interval is not present, raise ValueError.
    */
    // since this is a list, called methods can set this to [1],
    // making it true
    const result = this.removeIntervalHelper(interval, [], true)
    // this.logger.info({ interval, result }, 'remove')
    // result may be null if the node was pruned
    result?.updateNodeAttributes()
    return result
  }

  public removeIntervalHelper(
    interval: Interval,
    done: number[],
    shouldRaiseError = false
  ): Node {
    /*
    Returns self after removing interval and balancing.
    If interval doesn't exist, raise ValueError.
    This method may set done to [1] to tell all callers that
    rebalancing has completed.
    See Eternally Confuzzled's jsw_remove_r function (lines 1-32)
    in his AVL tree article for reference.
    */
    // debug(`removeIntervalHelper: ${this.toString()}`)

    if (this.centerHit(interval)) {
      // debug('removeIntervalHelper: center hit')
      if (!shouldRaiseError && !this.sCenter.has(interval)) {
        done.push(1)
        return this
      }
      try {
        // raises error if interval not present - this is
        // desired.
        this.sCenter = this.sCenter.remove(interval)
      } catch (e) {
        throw new TypeError(interval.toString())
      }
      if (this.sCenter.size) {
        // keep this node
        done.push(1) // no rebalancing necessary
        // debug('removeIntervalHelper: Removed, no rebalancing.')
        this.updateNodeAttributes()
        return this
      } else {
        // If we reach here, no intervals are left in this.sCenter
        // So, prune self.
        // debug('removeIntervalHelper: pruning self', this.xCenter)
        return this.prune()
      }
    } else {
      // interval not in sCenter
      // debug('removeIntervalHelper: not in center')
      const direction = this.hitBranch(interval)
      let branch = this.getBranch(direction)
      if (!this.getBranch(direction)) {
        if (shouldRaiseError) {
          throw new TypeError('interval not found')
        }
        done.push(1)
        return this
      }
      // debug(`removeIntervalHelper: Descending to ${direction} branch`)
      branch = branch.removeIntervalHelper(interval, done, shouldRaiseError)
      this.setBranch(direction, branch)
      this.updateNodeAttributes()

      // Clean up
      if (!done.length) {
        // debug(`removeIntervalHelper: rotating ${this.xCenter}`)
        return this.rotate()
      }
      return this
    }
  }

  public prune(): Node {
    /*
    On a subtree where the root node's sCenter is empty,
    return a new subtree with no empty sCenters.
    */
    // debug(`prune: Pruning ${this.toString()}`)
    const leftBranch = this.getBranch(0)
    const rightBranch = this.getBranch(1)

    // if I have an empty branch
    if (!leftBranch || !rightBranch) {
      const direction = !leftBranch // graft the other branch here
      // debug(`prune: Grafting ${direction ? 'right' : 'left'} branch`)
      const result = this.getBranch(direction)
      if (!result) {
        // debug('prune: No branch to graft')
      } else {
        result.verify()
      }
      return result
    } else {
      // Replace the root node with the greatest predecessor.
      const result = this.getBranch(0).popGreatestChild()
      let heir = result[0]
      const newBranch = result[1]
      // debug('*** after popGreatestChild, heir, newBranch')
      // heir.printStructure()
      // newBranch?.printStructure()

      this.setBranch(0, newBranch)
      this.updateNodeAttributes()

      // debug(`prune: Replacing ${this} with ${heir}`)

      // Set up the heir as the new root node
      heir.setBranch(0, this.getBranch(0))
      heir.setBranch(1, this.getBranch(1))
      heir.updateNodeAttributes()

      // popping the predecessor may have unbalanced this node;
      // fix it
      // debug('*** before replacing with heir')
      // heir.printStructure()
      heir = heir.rotate()
      // debug('*** after replacing with heir')
      // heir.printStructure()
      heir.verify()
      // debug('finished pruning')
      return heir
    }
  }

  public popGreatestChild(): [Node, Node] {
    /*
      Used when pruning a node with both a left and a right branch.
      Returns (greatestChild, node), where:
        * greatestChild is a new node to replace the removed node.
        * node is the subtree after:
            - removing the greatest child
            - balancing
            - moving overlapping nodes into greatest_child
      Assumes that this.sCenter is not empty.
      See Eternally Confuzzled's jsw_remove_r function (lines 34-54)
      in his AVL tree article for reference.
    */
    if (!this.rightNode) {
      // debug('popGreatestChild: no right node')
      // This node is the greatest child.
      // To reduce the chances of an overlap with a parent, return
      // a child node containing the smallest possible number of
      // intervals, as close as possible to the maximum bound.
      const compareEndFirst = (a: Interval, b: Interval) =>
        a.end - b.end || a.start - b.start
      const ivs = this.sCenter.toSorted(compareEndFirst)
      const maxIv = ivs.pop()!
      const newXCenter = ivs.reduce((currentXCenter, nextMaxIv) => {
        if (nextMaxIv.end !== maxIv.end) {
          return Math.max(currentXCenter, nextMaxIv.end)
        }
        return currentXCenter
      }, this.xCenter)
      // Create a new node with the largest x_center possible.
      const newIvs = this.sCenter.filter((iv) => iv.containsPoint(newXCenter))
      // this.logger.info('popGreatestChild: newIvs', newIvs)
      const child = Node.fromIntervals(newIvs)
      if (!child) {
        throw new TypeError('child should not be null')
      }
      child.xCenter = newXCenter
      this.sCenter = this.sCenter.difference(child.sCenter)
      this.updateNodeAttributes()

      if (this.sCenter.size) {
        this.verify()
        return [child, this]
      } else {
        this.getBranch(0)?.verify()
        // Rotate left child up
        return [child, this.getBranch(0)]
      }
    } else {
      // debug('popGreatestChild: has right node, ', this.getBranch(1).xCenter)
      const result = this.getBranch(1).popGreatestChild()
      let greatestChild = result[0]
      const newRightBranch = result[1]
      this.setBranch(1, newRightBranch)
      this.refreshBalance()
      this.updateNodeAttributes()
      let newSelf = this.rotate()

      // Move any overlaps into greatest_child

      const updatedNodes = new Set<Node>()
      newSelf.walkNodes((node) => {
        node.sCenter.forEach((iv) => {
          if (iv.containsPoint(greatestChild.xCenter)) {
            // debug(
            //   'popGreatestChild: moving',
            //   iv,
            //   'to greatestChild',
            //   greatestChild.xCenter
            // )
            node.sCenter.remove(iv)
            updatedNodes.add(node)
            greatestChild = greatestChild.add(iv)
          }
        })
      })

      // update node attributes of updated nodes
      updatedNodes.forEach((node) => {
        node.updateNodeAttributes()
      })
      greatestChild.updateNodeAttributes()

      if (newSelf.sCenter.size) {
        this.verify()
        this.refreshBalance()
        this.updateNodeAttributes()
        newSelf = newSelf.rotate()
        newSelf.refreshBalance()
        newSelf.updateNodeAttributes()
        newSelf.verify()
        // debug('popGreatestChild: after rotating')
        return [greatestChild, newSelf]
      } else {
        newSelf = newSelf.prune()
        // debug('popGreatestChild: after pruning')
        // newSelf?.printStructure()
        newSelf?.updateNodeAttributes()
        return [greatestChild, newSelf]
      }
    }
  }

  // #region Verify

  /**
   * Recursively ensures that the invariants of an interval subtree hold.
   * @param parents - The set of parent xCenters.
   * @returns undefined if the subtree is valid, otherwise throws error.
   */
  public verify(parents: Set<number> = new Set()) {
    // Node is balanced
    const bal = this.balance
    assert(
      Math.abs(bal) < 2,
      `Error: Rotation should have happened, but didn't! balance=${bal}`
    )

    // balance is up-to-date
    this.refreshBalance()
    assert.equal(
      bal,
      this.balance,
      `Error: (x=${this.xCenter}) balance not set correctly!`
    )

    // sCenter should not be empty
    assert(this.sCenter.size > 0, `Error: sCenter is empty!`)

    // intervals in sCenter are valid
    this.sCenter.forEach((iv) => {
      assert(typeof iv.start === 'number', `start not number: ${iv.start}`)
      assert(typeof iv.end === 'number', `end not number: ${iv.end}`)
      assert(iv.start < iv.end, 'start comes before end')
      assert(
        iv.overlaps(this.xCenter),
        iv.toString() + ' does not overlap center'
      )
      parents.forEach((parent) => {
        if (iv.containsPoint(parent)) {
          this.printStructure()
        }
        assert(
          !iv.containsPoint(parent),
          `Error: Overlapping ${iv.toString()} with ancestor parent xCenter=${parent}`
        )
      })
    })

    // verify maxLength
    const actualMaxLength = this.calcMaxLength()
    assert(
      this.maxLength === actualMaxLength,
      `maxlength incorrect, this.maxLength=${this.maxLength}, actual=${actualMaxLength}`
    )

    const actualMaxStart = this.calcMaxStart()
    // if (this.maxStart !== actualMaxStart) {
    //   this.printStructure()
    // }
    assert(
      this.maxStart === actualMaxStart,
      `(${this.xCenter}) maxStart incorrect, this.maxStart=${this.maxStart}, actual=${actualMaxStart}`
    )

    // recursively verify branches
    if (this.getBranch(0)) {
      assert(
        this.getBranch(0).xCenter < this.xCenter,
        'Error: Out-of-order left child !'
      )
      this.getBranch(0).verify(new Set([...parents, this.xCenter]))
    }

    if (this.getBranch(1)) {
      assert(
        this.getBranch(1).xCenter > this.xCenter,
        'Error: Out-of-order right child!'
      )
      this.getBranch(1).verify(new Set([...parents, this.xCenter]))
    }
  }

  // #region allChildren

  public allChildren(): IntervalHashSet {
    return this.allChildrenHelper(new IntervalHashSet([]))
  }

  private allChildrenHelper(result: IntervalHashSet): IntervalHashSet {
    result.addAll(this.sCenter.toArray())
    this.walkNodes((node) => {
      result.addAll(node.sCenter.toArray())
    })
    return result
  }

  // #endregion allChildren

  private updateNodeAttributes() {
    this.updateMaxLength()
    this.updateMaxStart()
  }

  private updateMaxLength() {
    this.maxLength = this.calcMaxLength()
  }

  private updateMaxStart() {
    this.maxStart = this.calcMaxStart()
  }

  private calcMaxLength() {
    return this.reduceNodes((maxLen, node) => {
      node.sCenter.forEach((iv) => {
        maxLen = Math.max(maxLen, iv.length)
      })
      return maxLen
    }, 0)
    // FIXME: is 0 the right initial value?
  }

  private calcMaxStart() {
    return this.reduceNodes((maxStart, node) => {
      node.sCenter.forEach((iv) => {
        maxStart = Math.max(maxStart, iv.start)
      })
      return maxStart
    }, 0)
    // FIXME: is 0 the right initial value?
  }

  private walkNodes(callback: (node: Node) => void) {
    callback(this)
    if (this.getBranch(0)) {
      this.getBranch(0).walkNodes(callback)
    }
    if (this.getBranch(1)) {
      this.getBranch(1).walkNodes(callback)
    }
  }

  private reduceNodes<T>(
    callback: (accumulator: T, node: Node) => T,
    initialValue: T
  ): T {
    let accumulator = initialValue
    this.walkNodes((node) => {
      accumulator = callback(accumulator, node)
    })
    return accumulator
  }
  // #endregion

  // #region Rotation

  private singleRotate(): Node {
    // Single rotation. Assumes that balance is +-2.
    assert(this.balance !== 0, 'Error: singleRotate called on balanced node')
    const pivotNodeDirection = this.balance > 0 // true for right-heavy, false for left-heavy
    const oppositeDirection = !pivotNodeDirection
    const heavyChild = this.getBranch(pivotNodeDirection)

    // debug(
    //   'singleRotate',
    //   `pivotNode xCenter=${this.xCenter}`,
    //   this.toString(),
    //   `balance=${this.balance}, ${heavyChild.balance}`,
    //   `pivotNodeDirection=${branchStr(pivotNodeDirection)}`
    // )

    // Adjusting branches for rotation
    this.setBranch(pivotNodeDirection, heavyChild.getBranch(oppositeDirection))
    heavyChild.setBranch(oppositeDirection, this.rotate()) // Ensures balance under new subtree root

    this.updateNodeAttributes()

    // debug('singleRotate: after rotate - heavyChild')
    // heavyChild.printStructure()
    // Handling overlapping intervals (if applicable)
    // Some intervals may overlap both this.xCenter and save.xCenter
    // Promote those to the new tip of the tree
    const promotees = heavyChild
      .getBranch(oppositeDirection)
      .sCenter.filter((iv) => heavyChild.centerHit(iv))
    this.logger.info({ promotees }, 'singleRotate')
    if (promotees.length) {
      for (const iv of promotees) {
        // debug('removing', iv)
        heavyChild.setBranch(
          oppositeDirection,
          heavyChild.getBranch(oppositeDirection).remove(iv)
        )
      }
      promotees.forEach((iv) => {
        heavyChild.sCenter.add(iv)
      })
    }

    // Refreshing balances and updating tree properties
    heavyChild.refreshBalance()
    heavyChild.updateNodeAttributes()

    // The result of single rotation is the new subtree root
    return heavyChild.rotate()
  }

  private doubleRotate(): Node {
    // Determine the direction of imbalance for the pivotNode
    const pivotNodeDirection = this.balance > 0 // true for right-heavy, false for left-heavy

    // const log = this.logger.child({
    //   pivotNodeDirection: branchStr(pivotNodeDirection),
    // })

    // log.info('doubleRotate, before first rotation')
    // this.printStructure()

    // First rotation: Rotate the heavyChild in the opposite direction
    // This sets up for the second rotation
    this.setBranch(
      pivotNodeDirection,
      this.getBranch(pivotNodeDirection).singleRotate()
    )

    // log.info('doubleRotate, after first rotation')
    // this.printStructure()

    // Refresh balance factors after the first rotation
    this.refreshBalance()
    this.updateNodeAttributes()

    // Second rotation: Now perform a single rotation on the pivotNode
    return this.singleRotate()
  }

  // #endregion Rotation

  /**
   * Converts the Node object to a JSON representation. Useful for reproducing
   * complex Node objects in tests.
   * @returns The JSON representation of the Node object.
   */
  public toJSON(): JSONNode {
    return {
      xCenter: this.xCenter,
      sCenter: this.sCenter.toArray(),
      leftNode: this.leftNode?.toJSON() ?? null,
      rightNode: this.rightNode?.toJSON() ?? null,
      depth: this.depth,
      balance: this.balance,
    }
  }
}

type JSONNode = {
  xCenter: number
  sCenter: { start: number; end: number }[]
  leftNode: JSONNode | null
  rightNode: JSONNode | null
  depth: number
  balance: number
}

const branchStr = (branch: boolean | number) => (branch ? 'right' : 'left')
