import { Interval } from './Interval'
import { Node } from './Node'
import fs from 'fs'

describe('Node', () => {
  it('double rotation should not leave in invalid state', () => {
    const json = JSON.parse(
      fs.readFileSync(__dirname + '/_fixtures/node.json', 'utf8').toString()
    ) as unknown as JSONNode
    let root = createNodeFromJson(json)
    if (!root) throw new Error('Root was undefined')
    root = root.rotate()
    root.verify()
  })

  it('calculates maxLength for subnodes', () => {
    const root = new Node(
      5,
      [new Interval(1, 2)],
      new Node(2, [new Interval(1, 6)], null, null, false, 1, 0),
      new Node(8, [new Interval(8, 10)], null, null, false, 1, 0),
      false,
      0,
      0
    )
    expect(root.maxLength).toEqual(5)

    // test adding intervals
    root.add(new Interval(1, 600))
    expect(root.maxLength).toEqual(599)

    // test removing intervals
    root.remove(new Interval(1, 600))
    expect(root.maxLength).toEqual(5)

    // test that it works after a rotation
    // configure the tree to be unbalanced
    root.rotate()
    expect(root.maxLength).toEqual(5)
  })

  it('calculates maxStart', () => {
    const root = new Node(
      5,
      [new Interval(188, 250)],
      new Node(2, [new Interval(15, 19)], null, null, false, 1, 0),
      new Node(8, [new Interval(8, 10)], null, null, false, 1, 0),
      false,
      0,
      0
    )
    expect(root.maxStart).toEqual(188)
  })
})

type JSONNode = {
  xCenter: number
  sCenter: { start: number; end: number }[]
  leftNode: JSONNode | null
  rightNode: JSONNode | null
  depth: number
  balance: number
}

function createNodeFromJson(json: JSONNode | null): Node | null {
  if (!json) return null

  // Create intervals for this node
  const intervals = json.sCenter.map((iv) => new Interval(iv.start, iv.end))

  // Recursively create left and right nodes
  const leftNode = createNodeFromJson(json.leftNode)
  const rightNode = createNodeFromJson(json.rightNode)

  // Create and return the node
  return new Node(
    json.xCenter,
    intervals,
    leftNode,
    rightNode,
    false,
    json.depth,
    json.balance
  )
}
