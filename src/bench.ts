import { IntervalTree } from './IntervalTree'

const numIntervals = 3000000
const universeSize = 100000000
const minIntervalSize = 500
const maxIntervalSize = 80000

console.time()
const ivs: [number, number][] = []
for (let i = 0; i < numIntervals; i++) {
  const size =
    Math.floor(Math.random() * (maxIntervalSize - minIntervalSize)) +
    minIntervalSize
  const start = Math.floor(Math.random() * (universeSize - size))
  const end = start + size
  //   console.log('creating new interval', { start, end })
  ivs.push([start, end])
}

const tree = new IntervalTree()
tree.initFromSimpleArray(ivs)
console.timeEnd()
