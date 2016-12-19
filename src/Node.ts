const assert = require('assert')
import { Interval } from "./Interval"
import { IntervalSet } from './set'

export class Node {
  private xCenter: number
  private sCenter: IntervalSet
  private leftNode: Node
  private rightNode: Node
  private depth: number
  private balance: number

  public constructor(xCenter:number, sCenter:Array<Interval>|IntervalSet=[], leftNode:Node, rightNode:Node) {
    if (xCenter) {
      this.xCenter = xCenter
      this.sCenter = new IntervalSet(sCenter)
      this.leftNode = leftNode
      this.rightNode = rightNode
      this.depth = 0 // set when rotated
      this.balance = 0 // ditto
      this.rotate()
    }
  }

  public static fromInterval(interval:Interval) {
    return new Node(interval.start, [interval])
  }

  public static fromIntervals(intervals:Array<Interval>):Node {
    if (!intervals || intervals.length < 1) {
      return null
    }
    let node = new Node()
    console.log('fromIntervals: intervals', intervals)
    let centerIv = intervals[Math.floor(intervals.length / 2)]
    console.log('fromIntervals: centerIv', centerIv)
    node.xCenter = centerIv.start
    node.sCenter = new IntervalSet()
    let sLeft:Interval[] = []
    let sRight:Interval[] = []
    for (let iv of intervals) {
      if (iv.end <= node.xCenter) {
        sLeft.push(iv)
      } else if (iv.start > node.xCenter) {
        sRight.push(iv)
      } else {
        node.sCenter.add(iv)
      }
    }
    console.log('fromIntervals: leftNode', sLeft, 'rightNode', sRight)
    node.leftNode = Node.fromIntervals(sLeft)
    node.rightNode = Node.fromIntervals(sRight)
    return node.rotate()
  }

  public centerHit(interval : Interval) {
    // Returns whether interval overlaps this.xCenter
    return interval.containsPoint(this.xCenter)
  }

  public refreshBalance() {
    // Recalculate balance and depth based on child node values.
    const leftDepth = this.leftNode ? this.leftNode.depth : 0
    const rightDepth = this.rightNode ? this.rightNode.depth : 0
    this.depth = 1 + Math.max(leftDepth, rightDepth)
    this.balance = rightDepth - leftDepth
    console.log(`refreshBalance: leftDepth=${leftDepth} rightDepth=${rightDepth} balance=${this.balance}`, this)
  }

  public rotate() {
    /*
    Does rotating, if necessary, to balance this node, and
    returns the new top node.
    */
    this.refreshBalance()
    if (Math.abs(this.balance) < 2)
      return this
    const myHeavy = this.balance > 0
    const childHeavy = this.getBranch(myHeavy).balance > 0
    console.log(`rotate: myHeavy=${myHeavy} childHeavy=${childHeavy} this.balance=${this.balance}`)
    if (myHeavy === childHeavy || this.getBranch(myHeavy).balance === 0) {
      console.log('Heavy sides same')
      return this.singleRotate()
    } else {
      return this.doubleRotate()
    }
  }

  private singleRotate() {
    // Single rotation. Assumes that balance is +-2.
    assert(this.balance != 0)
    const heavy = this.balance > 0
    const light = !heavy
    const save = this.getBranch(heavy)
    this.printStructure()
    console.log('singleRotate', this, 'bal=', this.balance, save.balance)
    // assert(save.getBranch(light))
    this.setBranch(heavy, save.getBranch(light))
    save.setBranch(light, this.rotate()) // Needed to ensure the 2 and 3 are balanced under new subnode

    // Some intervals may overlap both self.x_center and save.x_center
    // Promote those to the new tip of the tree
    const promotees = []
    for (let iv of save.getBranch(light).sCenter.toArray()) {
      if (save.centerHit(iv)) {
        promotees.push(iv)
      }
    }
    if (promotees.length) {
      console.log('have promotees', promotees)
      for (const iv of promotees) {
        save.setBranch(light, save.getBranch(light).remove(iv))
      }
      save.sCenter.update(promotees)
    }
    save.refreshBalance()
    return save
  }

  private doubleRotate() {
    // First rotation
    let myHeavy = this.balance > 0
    this.setBranch(myHeavy, this.getBranch(myHeavy).singleRotate())
    this.refreshBalance()
    // Second rotation
    return this.singleRotate()
  }

  public hitBranch(interval: Interval) {
    // Assuming not centerHit(interval), return which branch
    // (left=0, right=1) interval is in.
    return interval.start > this.xCenter
  }

  public getBranch(branch:Boolean|number) {
    if (branch) {
      return this.rightNode
    } else {
      return this.leftNode
    }
  }

  public setBranch(branch: Boolean|number, node: Node) {
    if (branch) {
      this.rightNode = node
    } else {
      this.leftNode = node
    }
  }

  public add(interval: Interval) {
    console.log('add', interval)
    if (this.centerHit(interval)) {
      console.log("add: center hit", interval)
      this.sCenter.add(interval)
      return this
    } else {
      let direction = this.hitBranch(interval)
      let branchNode = this.getBranch(direction)
      console.log("add: on branch", interval, direction)
      if (!this.getBranch(direction)) {
        this.setBranch(direction, Node.fromInterval(interval))
        this.refreshBalance()
        return this
      } else {
        this.setBranch(direction, branchNode.add(interval))
        console.log('existing branch, rotating')
        return this.rotate()
      }
    }
  }

  public printStructure(indent=0, tostring=false):string|null {
    const spaces = '    '.repeat(indent)
    let result = ''

    result += spaces + this.toString() + '\n'
    if (this.sCenter.length) {
      this.sCenter.forEach((interval) => {
        result += spaces + interval.toString() + '\n'
      })
    }
    if (this.leftNode) {
      result += (spaces + '<:  ' +
        this.leftNode.printStructure(indent + 1, true) + '\n')
    }
    if (this.rightNode) {
      result += (spaces + '>:  ' +
        this.rightNode.printStructure(indent + 1, true) + '\n')
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

  public searchPoint(point:number, result:IntervalSet):IntervalSet {
    // Returns all intervals that contain point.
    console.log('searchPoint: point=', point, this.toString())
    if (!this.sCenter) console.log('sCenter', this)
    this.sCenter.forEach(interval => {
      console.log('searchPoint: interval=', interval)
      if (interval.start <= point && point < interval.end)
        result.add(interval)
    })
    if (point < this.xCenter && this.getBranch(0)) {
      return this.getBranch(0).searchPoint(point, result)
    } else if (point > this.xCenter && this.getBranch(1)) {
      return this.getBranch(1).searchPoint(point, result)
    }
    return result
  }

  public searchOverlap(pointList: Array<number>) {
    const result = new IntervalSet()
    for (let point of pointList) {
      this.searchPoint(point, result)
    }
    return result
  }


  public remove(interval: Interval) {
    /*
    Returns self after removing the interval and balancing.
    If interval is not present, raise ValueError.
    */
    // since this is a list, called methods can set this to [1],
    // making it true
    let done:Array<number> = []
    return this.removeIntervalHelper(interval, done, true)
  }

  public removeIntervalHelper(interval: Interval, done: Array<number>, shouldRaiseError:Boolean=false) {
    /*
    Returns self after removing interval and balancing.
    If interval doesn't exist, raise ValueError.
    This method may set done to [1] to tell all callers that
    rebalancing has completed.
    See Eternally Confuzzled's jsw_remove_r function (lines 1-32)
    in his AVL tree article for reference.
    */
    if (this.centerHit(interval)) {
      if (!shouldRaiseError && !this.sCenter.has(interval)) {
        done.push(1)
        return this
      }
      try {
        // raises error if interval not present - this is
        // desired.
        this.sCenter.remove(interval)
      } catch (e) {
        this.printStructure()
        throw new KeyError(interval)
      }
      if (this.sCenter.length) { // keep this node
        done.push(1)  // no rebalancing necessary
        console.log('removeIntervalHelper: Removed, no rebalancing.')
        return this
      }
      // If we reach here, no intervals are left in self.s_center.
      // So, prune self.
      return this.prune()
    } else { // interval not in sCenter
      let direction = this.hitBranch(interval)
      if (!this.getBranch(direction)) {
        if (shouldRaiseError) {
          throw new TypeError()
        }
        done.push(1)
        return this

        console.log(`removeIntervalHelper: Descending to ${direction} branch`)
        this.setBranch(direction,
          this.getBranch(direction).removeIntervalHelper(
            interval, done, shouldRaiseError))

        // Clean up
        if (!done.length) {
          console.log(`removeIntervalHelper: rotating ${this.xCenter}`)
          return this.rotate()
        }
        return this
      }
    }
  }

  public prune() {
    /*
    On a subtree where the root node's s_center is empty,
    return a new subtree with no empty s_centers.
    */
    const leftBranch = this.getBranch(0)
    const rightBranch = this.getBranch(1)

    if (!leftBranch || !rightBranch) { // if I have an empty branch
      let direction = !leftBranch // graft the other branch here
      console.log(`prune: Grafting ${direction ? 'right' : 'left'} branch`)
      return this.getBranch(direction)
    } else {
      // Replace the root node with the greatest predecessor.
      let [heir, newBranch] = this.getBranch(0).popGreatestChild()
      console.log(`prune: Replacing ${this.xCenter} with ${heir.xCenter}`)

      // Set up the heir as the new root node
      heir.setBranch(0, this.getBranch(0))
      heir.setBranch(1, this.getBranch(1))

      // popping the predecessor may have unbalanced this node;
      // fix it
      heir.refreshBalance()
      heir = heir.rotate()
      return heir
    }
  }
}
