import assert from 'assert'

import { Interval } from './Interval'
import { HashSet, SortedSet } from '@rimbu/core'
import { IntervalSet } from './IntervalSet'
import { debug } from './debug'

export class Node {
  public static fromInterval(interval: Interval) {
    return new Node(interval.start, [interval])
  }

  public static fromIntervals(intervals: Interval[]): Node | null {
    if (!intervals || intervals.length < 1) {
      return null
    }
    const centerIv = intervals[Math.floor(intervals.length / 2)]
    const node = new Node(centerIv.start, [])
    const sLeft: Interval[] = []
    const sRight: Interval[] = []
    for (const iv of intervals) {
      if (iv.end <= node.xCenter) {
        sLeft.push(iv)
      } else if (iv.start > node.xCenter) {
        sRight.push(iv)
      } else {
        node.sCenter = node.sCenter.add(iv)
      }
    }
    node.leftNode = Node.fromIntervals(sLeft)!
    node.rightNode = Node.fromIntervals(sRight)!

    return node.rotate()
  }

  private xCenter: number
  private sCenter: SortedSet<Interval>
  private leftNode?: Node
  private rightNode?: Node
  private depth: number
  private balance: number

  public constructor(
    xCenter: number,
    sCenter: Interval[] | SortedSet<Interval>,
    leftNode?: Node,
    rightNode?: Node,
    rotate = true,
    depth = 0,
    balance = 0
  ) {
    this.xCenter = xCenter
    this.sCenter = Array.isArray(sCenter) ? IntervalSet.from(sCenter) : sCenter
    this.leftNode = leftNode
    this.rightNode = rightNode
    // depth & balance are set when rotated
    this.depth = depth
    this.balance = balance
    if (rotate) {
      this.rotate()
    }
  }

  public clone(): Node {
    function nodeCloner(node: Node) {
      return node ? node.clone() : node
    }
    return new Node(
      this.xCenter,
      this.sCenter,
      nodeCloner(this.leftNode!),
      nodeCloner(this.rightNode!),
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
    const leftDepth = this.leftNode ? this.leftNode.depth : 0
    const rightDepth = this.rightNode ? this.rightNode.depth : 0
    this.depth = 1 + Math.max(leftDepth, rightDepth)
    this.balance = rightDepth - leftDepth
    // debug(`refreshBalance: leftDepth=${leftDepth} rightDepth=${rightDepth} balance=${this.balance}`, this)
  }

  /**
   * Rotates, if necessary, to balance this node.
   * Returns new top node
   */
  public rotate() {
    this.refreshBalance()
    if (Math.abs(this.balance) < 2) {
      return this
    }
    const myHeavy = this.balance > 0
    const childHeavy = this.getBranch(myHeavy).balance > 0
    // debug(`rotate: myHeavy=${myHeavy} childHeavy=${childHeavy} this.balance=${this.balance}`)
    if (myHeavy === childHeavy || this.getBranch(myHeavy).balance === 0) {
      return this.singleRotate()
    } else {
      return this.doubleRotate()
    }
  }

  public hitBranch(interval: Interval) {
    // Assuming not centerHit(interval), return which branch
    // (left=0, right=1) interval is in.
    return interval.start > this.xCenter
  }

  public getBranch(branch: boolean | number): Node {
    if (branch) {
      return this.rightNode!
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
    // debug('add', interval)
    if (this.centerHit(interval)) {
      // debug('add: center hit', interval)
      this.sCenter = this.sCenter.add(interval)
      return this
    } else {
      const direction = this.hitBranch(interval)
      const branchNode = this.getBranch(direction)
      // debug('add: on branch', interval, direction)
      if (!this.getBranch(direction)) {
        this.setBranch(direction, Node.fromInterval(interval))
        this.refreshBalance()
        return this
      } else {
        this.setBranch(direction, branchNode.add(interval))
        // debug('existing branch, rotating')
        return this.rotate()
      }
    }
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
      console.log(result)
    }
  }

  public toString() {
    return `Node<${this.xCenter}, depth=${this.depth}, balance=${this.balance}>`
  }

  public searchPoint(
    point: number,
    resultBuilder: SortedSet.Builder<Interval>
  ) {
    // Returns all intervals that contain point.
    // debug('searchPoint: point=', point, this.toString())
    // debug('searchPoint: result=', result)
    this.sCenter.forEach((interval) => {
      // debug('searchPoint: interval=', interval)
      if (interval.start <= point && point < interval.end) {
        // debug('searchPoint interval', interval)
        resultBuilder.add(interval)
      }
    })
    if (point < this.xCenter && this.getBranch(0)) {
      this.getBranch(0).searchPoint(point, resultBuilder)
    } else if (point > this.xCenter && this.getBranch(1)) {
      this.getBranch(1).searchPoint(point, resultBuilder)
    }
    return resultBuilder
  }

  public searchOverlap(pointList: number[]): SortedSet<Interval> {
    const resultBuilder = IntervalSet.empty().toBuilder()
    for (const point of pointList) {
      this.searchPoint(point, resultBuilder)
    }
    return resultBuilder.build()
  }

  public remove(interval: Interval): Node {
    /*
    Returns self after removing the interval and balancing.
    If interval is not present, raise ValueError.
    */
    // since this is a list, called methods can set this to [1],
    // making it true
    return this.removeIntervalHelper(interval, [], true)
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
    debug(`removeIntervalHelper: ${this.toString()}`)

    if (this.centerHit(interval)) {
      debug('center hit')
      if (!shouldRaiseError && !this.sCenter.has(interval)) {
        done.push(1)
        return this
      }
      try {
        // raises error if interval not present - this is
        // desired.
        this.sCenter = this.sCenter.remove(interval)
      } catch (e) {
        this.printStructure()
        throw new TypeError(interval.toString())
      }
      if (this.sCenter.size) {
        // keep this node
        done.push(1) // no rebalancing necessary
        debug('removeIntervalHelper: Removed, no rebalancing.')
        return this
      } else {
        // If we reach here, no intervals are left in this.sCenter
        // So, prune self.
        debug('removeIntervalHelper: pruning self')
        return this.prune()
      }
    } else {
      // interval not in sCenter
      debug('removeIntervalHelper: not in center')
      const direction = this.hitBranch(interval)
      let branch = this.getBranch(direction)
      if (!this.getBranch(direction)) {
        if (shouldRaiseError) {
          throw new TypeError()
        }
        done.push(1)
        return this
      }
      debug(`removeIntervalHelper: Descending to ${direction} branch`)
      branch = branch.removeIntervalHelper(interval, done, shouldRaiseError)
      this.setBranch(direction, branch)
      // Clean up
      if (!done.length) {
        debug(`removeIntervalHelper: rotating ${this.xCenter}`)
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
    const leftBranch = this.getBranch(0)
    const rightBranch = this.getBranch(1)

    if (!leftBranch || !rightBranch) {
      // if I have an empty branch
      const direction = !leftBranch // graft the other branch here
      debug(`prune: Grafting ${direction ? 'right' : 'left'} branch`)
      return this.getBranch(direction)
    } else {
      // Replace the root node with the greatest predecessor.
      const result = this.getBranch(0).popGreatestChild()
      const heir = result[0]
      const newBranch = result[1]
      this.setBranch(0, newBranch)

      debug(`prune: Replacing ${this} with ${heir}`)

      // Set up the heir as the new root node
      heir.setBranch(0, this.getBranch(0))
      heir.setBranch(1, this.getBranch(1))

      // popping the predecessor may have unbalanced this node;
      // fix it
      heir.refreshBalance()
      return heir.rotate()
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
      // This node is the greatest child.
      // To reduce the chances of an overlap with a parent, return
      // a child node containing the smallest possible number of
      // intervals, as close as possible to the maximum bound.
      const compareEndFirst = (a: Interval, b: Interval) => {
        const key = (iv) => `${iv.end},${iv.start},${iv.data}`
        const keyA = key(a)
        const keyB = key(b)
        return keyA.localeCompare(keyB)
      }
      const ivs = this.sCenter.toArray().sort(compareEndFirst)
      const maxIv = ivs.pop()!
      let newXCenter = this.xCenter
      while (ivs.length) {
        const nextMaxIv = ivs.pop()!
        if (nextMaxIv.end === maxIv.end) {
          continue
        }
        newXCenter = Math.max(newXCenter, nextMaxIv.end)
      }
      // Create a new node with the largest x_center possible.
      const child = Node.fromIntervals(
        this.sCenter.filter((iv) => iv.containsPoint(newXCenter)).toArray()
      )!
      child.xCenter = newXCenter
      this.sCenter = this.sCenter.difference(child.sCenter)

      if (this.sCenter.size) {
        return [child, this]
      } else {
        return [child, this.getBranch(0)] // Rotate left child up
      }
    } else {
      const [greatestChild, newRightBranch] =
        this.getBranch(1).popGreatestChild()
      this.setBranch(1, newRightBranch)
      this.refreshBalance()
      let newSelf = this.rotate()

      // Move any overlaps into greatest_child
      newSelf.sCenter.forEach((iv) => {
        if (iv.containsPoint(greatestChild.xCenter)) {
          newSelf.sCenter = newSelf.sCenter.remove(iv)
          greatestChild.add(iv)
        }
      })

      if (newSelf.sCenter.size) {
        return [greatestChild, newSelf]
      } else {
        newSelf = newSelf.prune()
        return [greatestChild, newSelf]
      }
    }
  }

  public verify(parents: SortedSet<number> = SortedSet.empty<number>()) {
    // Recursively ensures that the invariants of an interval subtree hold.
    const constructor = this.sCenter.constructor.name
    assert(
      constructor === 'SortedSetLeaf',
      `sCenter type is incorrect: ${constructor}`
    )

    const bal = this.balance
    assert(
      Math.abs(bal) < 2,
      "Error: Rotation should have happened, but didn't!"
    )

    this.refreshBalance()
    assert(bal === this.balance, 'Error: this.balance not set correctly!')

    assert(
      this.sCenter.size,
      `Error: sCenter is empty!\n${this.printStructure(0, true)}`
    )

    this.sCenter.forEach((iv) => {
      assert(typeof iv.start === 'number', `start not number: ${iv.start}`)
      assert(typeof iv.end === 'number', `end not number: ${iv.end}`)
      assert(iv.start < iv.end, 'start comes before end')
      assert(iv.overlaps(this.xCenter), 'does not overlap center')
      parents.forEach((parent: number) => {
        assert(!iv.containsPoint(parent), 'Error: Overlaps ancestor')
      })
    })

    if (this.getBranch(0)) {
      assert(
        this.getBranch(0).xCenter < this.xCenter,
        'Error: Out-of-order left child !\n' + this.printStructure(0, true)
      )
      this.getBranch(0).verify(parents.union([this.xCenter]))
    }

    if (this.getBranch(1)) {
      assert(
        this.getBranch(1).xCenter > this.xCenter,
        'Error: Out-of-order right child!\n' + this.printStructure(0, true)
      )
      this.getBranch(1).verify(parents.union([this.xCenter]))
    }
  }

  public allChildren(): SortedSet<Interval> {
    return this.allChildrenHelper(IntervalSet.empty())
  }

  private allChildrenHelper(result: SortedSet<Interval>): SortedSet<Interval> {
    result = result.addAll(this.sCenter)
    if (this.getBranch(0)) {
      result = this.getBranch(0).allChildrenHelper(result)
    }
    if (this.getBranch(1)) {
      result = this.getBranch(1).allChildrenHelper(result)
    }
    return result
  }

  private doubleRotate() {
    // First rotation
    const myHeavy = this.balance > 0
    this.setBranch(myHeavy, this.getBranch(myHeavy).singleRotate())
    this.refreshBalance()
    // Second rotation
    return this.singleRotate()
  }

  private singleRotate() {
    // Single rotation. Assumes that balance is +-2.
    assert(this.balance !== 0)
    const heavy = this.balance > 0
    const light = !heavy
    const save = this.getBranch(heavy)
    // this.verify(new IntervalSet([]))
    // debug('singleRotate', this, 'bal=', this.balance, save.balance)
    // assert(save.getBranch(light))
    this.setBranch(heavy, save.getBranch(light))
    save.setBranch(light, this.rotate()) // Needed to ensure the 2 and 3 are balanced under new subnode

    // Some intervals may overlap both this.xCenter and save.xCenter
    // Promote those to the new tip of the tree
    const promotees: Interval[] = []
    save.getBranch(light).sCenter.forEach((iv) => {
      if (save.centerHit(iv)) {
        promotees.push(iv)
      }
    })
    if (promotees.length) {
      // debug('have promotees', promotees)
      for (const iv of promotees) {
        save.setBranch(light, save.getBranch(light).remove(iv))
      }
      save.sCenter = save.sCenter.addAll(promotees)
    }
    save.refreshBalance()
    return save
  }
}
