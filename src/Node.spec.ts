import { Interval } from './Interval'
import { Node } from './Node'
import fs from 'fs'

describe('Node', () => {
  it('double rotation should not leave in invalid state', () => {
    const json = JSON.parse(
      fs.readFileSync(__dirname + '/_fixtures/node.json', 'utf8').toString()
    )
    let root = createNodeFromJson(json)!
    root = root.rotate()
    root.verify()
  })
})

function createNodeFromJson(json): Node | undefined {
  if (!json) return undefined

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
