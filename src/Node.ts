let debug = require('debug')('intervaltree')
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

  public constructor(xCenter:number, sCenter:Array<Interval>|IntervalSet, leftNode?:Node, rightNode?:Node) {
    this.xCenter = xCenter
    this.sCenter = new IntervalSet(sCenter || [])
    this.leftNode = leftNode
    this.rightNode = rightNode
    this.depth = 0 // set when rotated
    this.balance = 0 // ditto
    this.rotate()
  }

  public static fromInterval(interval:Interval) {
    return new Node(interval.start, [interval])
  }

  public static fromIntervals(intervals:Array<Interval>):Node {
    if (!intervals || intervals.length < 1) {
      return null
    }
    let centerIv = intervals[Math.floor(intervals.length / 2)]
    let node = new Node(centerIv.start, new IntervalSet())
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
    if (myHeavy === childHeavy || this.getBranch(myHeavy).balance === 0) {
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
    // assert(save.getBranch(light))
    this.setBranch(heavy, save.getBranch(light))
    save.setBranch(light, this.rotate()) // Needed to ensure the 2 and 3 are balanced under new subnode

    // Promote those to the new tip of the tree
    const promotees:Interval[] = []
      if (save.centerHit(iv)) {
        promotees.push(iv)
      }
    if (promotees.length) {
      for (const iv of promotees) {
        save.setBranch(light, save.getBranch(light).remove(iv))
      }
      save.sCenter.addEach(promotees)
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
    if (this.centerHit(interval)) {
      this.sCenter.add(interval)
      return this
    } else {
      let direction = this.hitBranch(interval)
      let branchNode = this.getBranch(direction)
      if (!this.getBranch(direction)) {
        this.setBranch(direction, Node.fromInterval(interval))
        this.refreshBalance()
        return this
      } else {
        this.setBranch(direction, branchNode.add(interval))
        return this.rotate()
      }
    }
  }

  public printStructure(indent=0, tostring=false):string|null {
    let result = ''

    if (this.sCenter.length) {
    }
    if (this.leftNode) {
    }
    if (this.rightNode) {
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
    this.sCenter.forEach(interval => {
      if (interval.start <= point && point < interval.end) {
        result.add(interval)
      }
    })
    if (point < this.xCenter && this.getBranch(0)) {
      return this.getBranch(0).searchPoint(point, result)
    } else if (point > this.xCenter && this.getBranch(1)) {
      return this.getBranch(1).searchPoint(point, result)
    }
    return result
  }

  public searchOverlap(pointList: Array<number>):IntervalSet {
    const result = new IntervalSet()
    for (let point of pointList) {
      this.searchPoint(point, result)
    }
    return result
  }


  public remove(interval: Interval):Node {
    /*
    Returns self after removing the interval and balancing.
    If interval is not present, raise ValueError.
    */
    // since this is a list, called methods can set this to [1],
    // making it true
    let done:Array<number> = []
    return this.removeIntervalHelper(interval, done, true)
  }

  public removeIntervalHelper(interval: Interval, done: Array<number>,
                              shouldRaiseError:Boolean=false):Node {
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
        throw new TypeError(interval.toString())
      }
      if (this.sCenter.length) { // keep this node
        done.push(1)  // no rebalancing necessary
        return this
      }
    } else { // interval not in sCenter
      let direction = this.hitBranch(interval)
      if (!this.getBranch(direction)) {
        if (shouldRaiseError) {
          throw new TypeError()
        }
        done.push(1)
        return this
      }
      this.setBranch(direction, this.getBranch(direction).removeIntervalHelper(interval, done, shouldRaiseError))
      // this.branch[direction] = this.branch[direction].removeIntervalHelper(interval, done, shouldRaiseError)

      // Clean up
      if (!done.length) {
        return this.rotate()
      }
      return this
    }
  }

  public prune():Node {
    /*
    On a subtree where the root node's s_center is empty,
    return a new subtree with no empty s_centers.
    */
    const leftBranch = this.getBranch(0)
    const rightBranch = this.getBranch(1)

    if (!leftBranch || !rightBranch) { // if I have an empty branch
      let direction = !leftBranch // graft the other branch here
      return this.getBranch(direction)
    } else {
      // Replace the root node with the greatest predecessor.
      let [heir, newBranch] = this.getBranch(0).popGreatestChild()

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

  public popGreatestChild():[Node, Node] {
    /*
      Used when pruning a node with both a left and a right branch.
        * node is the subtree after:
            - removing the greatest child
            - balancing
            - moving overlapping nodes into greatest_child
      See Eternally Confuzzled's jsw_remove_r function (lines 34-54)
      in his AVL tree article for reference.
    */
    if (!this.rightNode) { // This node is the greatest child.
      // To reduce the chances of an overlap with a parent, return
      // a child node containing the smallest possible number of
      // intervals, as close as possible to the maximum bound.
      let ivs = this.sCenter.sorted((a:Interval, b:Interval) => {
        let keyA = `${a.end},${a.start}`
        let keyB = `${b.end},${b.start}`
        if (keyA < keyB) {
          return -1
        } else if (keyA > keyB) {
          return 1
        }
        return 0
      })
      let maxIv = ivs.pop()
      let newXCenter = this.xCenter
      while (ivs.length) {
        let nextMaxIv = ivs.pop()
        if (nextMaxIv.end === maxIv.end) continue
        newXCenter = Math.max(newXCenter, nextMaxIv.end)
      }
      // Create a new node with the largest x_center possible.
      let child = Node.fromIntervals(this.sCenter.filter(iv => iv.containsPoint(newXCenter)).toArray())
      child.xCenter = newXCenter
      this.sCenter = this.sCenter.difference(child.sCenter)

      if (this.sCenter.length) {
        return [child, this]
      } else {
        return [child, this.getBranch(0)]  // Rotate left child up
      }
    } else {
        let [greatestChild, newRightBranch] = this.getBranch(1).popGreatestChild()
        this.setBranch(1, newRightBranch)
        this.refreshBalance()
        let newSelf = this.rotate()

        // Move any overlaps into greatest_child
        newSelf.sCenter.forEach((iv) => {
          if (iv.containsPoint(greatestChild.xCenter)) {
            newSelf.sCenter.remove(iv)
            greatestChild.add(iv)
          }
        })

        if (newSelf.sCenter.length) {
          return [greatestChild, newSelf]
        } else {
          newSelf = newSelf.prune()
          return [greatestChild, newSelf]
        }
    }
  }
}
