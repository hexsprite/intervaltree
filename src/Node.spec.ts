import { Interval } from './Interval'
import { Node } from './Node'

it('should create a new node', () => {
  const iv = new Interval(0, 10)
  const node = new Node(iv)
  expect(node).toBeDefined()
  expect(node.start).toEqual(iv.start)
  expect(node.maxEnd).toEqual(iv.end)
  expect(node.minStart).toEqual(iv.start)
})

it('should add a new interval to the node', () => {
  const iv = new Interval(0, 10)
  const node = new Node(iv)
  const iv2 = new Interval(5, 15)
  node.insert(iv2)
  expect(node.maxEnd).toEqual(iv2.end)
  expect(node.minStart).toEqual(iv.start)
  expect(node._left).toBeNull()
  expect(node._right).toBeDefined()
})

describe('node AVL rotations', () => {
  // Every case inserts starts 1, 2, 3 (as unit intervals [n, n+1)) in an
  // order that forces one rotation. All four converge on the same balanced
  // shape: root 2, left child 1, right child 3, height 2, balance 0.
  function expectBalancedShape(root: Node<unknown>) {
    expect(root.start).toBe(2)
    expect(root._left!.start).toBe(1)
    expect(root._right!.start).toBe(3)
    expect(root.height).toBe(2)
    expect(root.balance).toBe(0)
    expect(root.maxEnd).toBe(4)
  }

  it('rotates left on a right-right insertion (1, 2, 3)', () => {
    let root: Node<unknown> = new Node(new Interval(1, 2))
    root = root.insert(new Interval(2, 3))
    root = root.insert(new Interval(3, 4))
    expectBalancedShape(root)
  })

  it('rotates right on a left-left insertion (3, 2, 1)', () => {
    let root: Node<unknown> = new Node(new Interval(3, 4))
    root = root.insert(new Interval(2, 3))
    root = root.insert(new Interval(1, 2))
    expectBalancedShape(root)
  })

  it('rotates right-left on a right-left insertion (1, 3, 2)', () => {
    let root: Node<unknown> = new Node(new Interval(1, 2))
    root = root.insert(new Interval(3, 4))
    root = root.insert(new Interval(2, 3))
    expectBalancedShape(root)
  })

  it('rotates left-right on a left-right insertion (3, 1, 2)', () => {
    let root: Node<unknown> = new Node(new Interval(3, 4))
    root = root.insert(new Interval(1, 2))
    root = root.insert(new Interval(2, 3))
    expectBalancedShape(root)
  })

  it('stays balanced (|balance| <= 1 everywhere) after ascending inserts 1..7', () => {
    function checkBalance(node: Node<unknown> | null): number {
      if (!node)
        return 0
      const leftHeight = checkBalance(node._left)
      const rightHeight = checkBalance(node._right)
      expect(Math.abs(leftHeight - rightHeight)).toBeLessThanOrEqual(1)
      return 1 + Math.max(leftHeight, rightHeight)
    }

    let root: Node<unknown> = new Node(new Interval(1, 2))
    for (let n = 2; n <= 7; n++)
      root = root.insert(new Interval(n, n + 1))

    expect(root.height).toBe(3)
    checkBalance(root)
  })
})

describe('successor graft height', () => {
  // Regression: successor graft relied on rotate() to repair a stale cloned height.
  function expectHeights(node: Node<unknown> | null): number {
    if (!node)
      return 0
    const leftHeight = expectHeights(node._left)
    const rightHeight = expectHeights(node._right)
    const expectedHeight = 1 + Math.max(leftHeight, rightHeight)
    expect(node.height).toEqual(expectedHeight)
    expect(Math.abs(leftHeight - rightHeight)).toBeLessThanOrEqual(1)
    return expectedHeight
  }

  it('keeps heights and balance correct after removing a two-child node whose successor has no left child', () => {
    const starts = [50, 25, 75, 60, 90, 55, 65]
    let root: Node<unknown> = new Node(new Interval(starts[0], starts[0] + 1))
    for (const start of starts.slice(1))
      root = root.insert(new Interval(start, start + 1))

    // Remove 75: two children, successor is 90 (no left child).
    root = root.remove(new Interval(75, 76))!
    expectHeights(root)

    // Remove 50: two children, successor is 55.
    root = root.remove(new Interval(50, 51))!
    expectHeights(root)
  })
})
