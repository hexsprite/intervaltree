//const S = require('serialise')
//const serialize = require('serialize-javascript')
const IntervalTree = require('.').IntervalTree
const _ = require('lodash')
tree1 = new IntervalTree()
console.time('testmod')
tree1.addInterval(1, 2, 'data')
for (const a in _.range(10000)) {
  tree1.addInterval(3, 4)
}
tree1.containsPoint(10)
const json = JSON.stringify(tree1)
tree2 = IntervalTree.fromJSON(json)
console.log('equals', tree1.allIntervals.equals(tree2.allIntervals))
console.timeEnd('testmod')
