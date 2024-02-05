import { Interval } from './Interval'
import { Node } from './Node'
import fs from 'fs'

describe('Node', () => {
  it('double rotation should not leave in invalid state', () => {
    const intervals = [
      [478019, 486075],
      [478041, 483497],
      [478215, 486619],
      [478416, 488227],
      [479107, 483366],
      [479112, 488300],
      [479867, 489663],
      [481266, 490406],
      [482870, 485066],
      [483050, 487543],
      [484692, 485957],
      [488408, 489859],
      [490057, 492197],
      [491277, 493556],
    ].map((iv) => new Interval(iv[0], iv[1]))
    let root = Node.fromIntervals(intervals)!
    root = root.rotate()
    root.verify()
  })

  it('overlaps corner case', () => {
    const json = JSON.parse(
      fs
        .readFileSync(__dirname + '/_fixtures/2024_02_03_overlaps.json', 'utf8')
        .toString()
    ) as unknown as JSONNode
    let root = createNodeFromJson(json)!
    root.verify()
    try {
      root = root.add(new Interval(12, 37))
    } catch (e) {
      console.log('*** BAD STRUCTURE ***')
      root.printStructure()
      throw e
    }
    root.verify()
  })

  it('calculates maxLength for subnodes', () => {
    const ivs = [
      [1, 2],
      [1, 6],
      [8, 10],
    ]
    let root: Node
    ivs.forEach((ivt) => {
      const iv = new Interval(ivt[0], ivt[1])
      if (!root) {
        root = Node.fromInterval(iv)
      } else {
        root = root.add(iv)
      }
    })
    if (!root!) {
      throw 'no root'
    }
    expect(root.maxLength).toEqual(5)
    root.printStructure()
    root.verify()

    // test adding intervals
    try {
      root = root.add(new Interval(1, 600))
      root.verify()
    } catch (e) {
      root.printStructure()
      throw e
    }
    expect(root.maxLength).toEqual(599)

    // test removing intervals
    root = root.remove(new Interval(1, 600))
    expect(root.maxLength).toEqual(5)

    // test that it works after a rotation
    // configure the tree to be unbalanced
    root = root.rotate()
    root.verify()
    expect(root.maxLength).toEqual(5)
  })

  it('calculates maxStart', () => {
    const root = Node.fromIntervals([
      new Interval(188, 250),
      new Interval(2, 19),
      new Interval(8, 10),
    ])!
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
