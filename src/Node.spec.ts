import { expect, test } from 'bun:test'
import { Interval } from './Interval'
import { IntervalTree } from './IntervalTree'
import { Node } from './Node'

test('should create a new node', () => {
  const iv = new Interval(0, 10)
  const node = new Node(iv)
  expect(node).toBeDefined()
  expect(node.start).toEqual(iv.start)
  expect(node.maxEnd).toEqual(iv.end)
  expect(node.minStart).toEqual(iv.start)
})

test('should add a new interval to the node', () => {
  const iv = new Interval(0, 10)
  const node = new Node(iv)
  const iv2 = new Interval(5, 15)
  node.insert(iv2)
  expect(node.maxEnd).toEqual(iv2.end)
  expect(node.minStart).toEqual(iv.start)
  // @ts-expect-error - private member
  expect(node.left).toBeNull()
  // @ts-expect-error - private member
  expect(node.right).toBeDefined()
})
