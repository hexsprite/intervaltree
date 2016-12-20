"use strict"

import 'jest'
require("babel-core/register")
require("babel-polyfill")

import { IntervalTree } from "./IntervalTree"

describe("IntervalTree", () => {
  let tree: IntervalTree

  const expectTree = (value: string) => {
    expect(tree.toString()).toBe(value)
  }

  beforeEach(() => {
    tree = new IntervalTree()
  })

  it("Should be pass sanity", () => {
    expect(typeof IntervalTree).toBe("function")
  })

  it("Should be able to create new instance", () => {
    expect(typeof new IntervalTree()).toBe("object")
  })

  it("inserts interval", () => {
    tree.addInterval(1, 5)
    expectTree("IntervalTree([Interval(1, 5)])")
  })

  it("merges overlapping intervals", () => {
    tree.addInterval(1, 5)
    tree.addInterval(5, 9)
    tree.mergeOverlaps()
    expectTree("IntervalTree([Interval(1, 9)])")
  })

  // it("can be an array", () => {
  //   tree.addInterval(1, 5, 'hello')
  //   expect(tree.toArray()).toBe([1,5])
  // })

  it("get first and last interval", () => {
    tree.addInterval(5, 10)
    tree.addInterval(0,4)
    tree.printStructure()
    expect(tree.first().toString()).toBe("Interval(0, 4)")
    expect(tree.last().toString()).toBe("Interval(5, 10)")
  })

  it("chops tree", () => {
    tree.addInterval(0, 10)
    tree.printStructure()
    tree.chop(3, 7)
    expectTree("IntervalTree([Interval(0, 3),Interval(7, 10)])")
  })

  it("find intervals of minimum length", () => {
    tree.addInterval(0,1)
    tree.addInterval(2,4)
    tree.addInterval(5,8)
    tree.addInterval(9,13)
    tree.addInterval(14,19)
    expect(tree.searchByLength(3).toArray().toString())
    .toBe("Interval(5, 8),Interval(9, 13),Interval(14, 19)")
  })
})
