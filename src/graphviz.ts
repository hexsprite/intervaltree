import { attribute, Digraph, Edge, toDot } from 'ts-graphviz'
import { toFile } from 'ts-graphviz/adapter'
import { Node } from './Node'

/**
 * Renders a node as an image and saves it to a file.
 * @param node - The node to render.
 * @param id - The identifier for the image file.
 */
export function renderNodeAsImage(node: Node, id: string) {
  const filename = `${new Date().getTime()}_${id}.png`
  // @ts-expect-error: private field
  console.log(`*** Rendered node ${node.xCenter} to: ${filename}`)
  const G = new Digraph('G', { rankdir: 'TB' })
  nodeToDot(node, G)
  const dot = toDot(G)
  // ignore promise using void
  void toFile(dot, filename, { format: 'png' })
}

/**
 * Converts a Node object to a DOT representation for Graphviz.
 *
 * @param node - The Node object to convert.
 * @param G - The Digraph object representing the graph.
 * @returns The created graph node.
 */
function nodeToDot(node: Node, G: Digraph) {
  // @ts-expect-error: private field
  const intervalsForDot = node.sCenter
    .map((iv) => `${iv.start}-${iv.end}`)
    .join('|')
  // @ts-expect-error: private field
  const gnode = G.createNode(String(node.xCenter), {
    [attribute.shape]: 'record',
    // @ts-expect-error: private fields
    [attribute.label]: `${node.xCenter} (${node.depth}, ${node.balance}) | {${intervalsForDot}}`,
  })
  G.addNode(gnode)

  // @ts-expect-error: private field
  if (node.leftNode) {
    // @ts-expect-error: private field
    const left = nodeToDot(node.leftNode, G)
    const edge = new Edge([gnode.port('sw'), left], {
      [attribute.label]: 'L',
    })
    G.addEdge(edge)
  }

  // @ts-expect-error: private field
  if (node.rightNode) {
    // @ts-expect-error: private field
    const right = nodeToDot(node.rightNode, G)
    const edge = new Edge([gnode.port('se'), right], {
      [attribute.label]: 'R',
    })
    G.addEdge(edge)
  }

  return gnode
}
