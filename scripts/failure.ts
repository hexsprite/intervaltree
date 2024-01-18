import fs from 'fs'
import { Interval } from '../src/Interval'
import { IntervalTree } from '../src/IntervalTree'

const tree = new IntervalTree()

const filename = process.argv[2]

function main() {
  const intervals = JSON.parse(fs.readFileSync(filename).toString()).map(
    (d) => new Interval(d.start, d.end)
  )
  console.log(intervals.length)
  tree.initFromArray(intervals)
  tree.verify()
}

main()
