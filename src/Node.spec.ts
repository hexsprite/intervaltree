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
