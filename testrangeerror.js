//const S = require('serialise')
//const serialize = require('serialize-javascript')
const { IntervalTree, Interval } = require('.')
tree1 = new IntervalTree()
tree1.addInterval(1, 2)
// tree1.remove(new Interval(1, 3))
tree1.removeEnveloped(1, 3)