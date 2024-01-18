import fs from 'fs'
import { Interval } from './src/Interval'
import { IntervalTree } from './src/IntervalTree'

const tree = new IntervalTree()

const numIntervals = 1000
const intervalRangeSize = 1_000_000

let allIntervals: Interval[] = []

function generateRandomIntervals(numIntervals: number) {
  allIntervals = []
  for (let i = 0; i < numIntervals; i++) {
    const start = Math.floor(Math.random() * intervalRangeSize)
    const end = start + Math.floor(Math.random() * 10000) + 1 // Ensure end > start
    allIntervals.push(new Interval(start, end))
  }
  // sort allIntervals ascending by start, then end
  allIntervals.sort((a, b) => {
    return a.start - b.start || a.end - b.end
  })
}

function searchIntervals() {
  for (let i = 0; i < numIntervals; i++) {
    const start = Math.floor(Math.random() * intervalRangeSize)
    tree.search(start)
  }
}

function searchArrayIntervals() {
  for (let i = 0; i < numIntervals; i++) {
    const start = Math.floor(Math.random() * intervalRangeSize)
    const found = allIntervals.find((interval) => interval.containsPoint(start))
    // if (found) {
    //   console.log(found)
    // }
  }
}

let count = 0
function benchmarkIntervals() {
  while (true) {
    // console.time('generate')
    generateRandomIntervals(numIntervals)
    try {
      tree.initFromArray(allIntervals)
    } catch (e) {
      console.error(e)
      console.log('INVALID INTERVALS')
      writeFailure('gen', allIntervals)
      break
    }
    // console.log(allIntervals)
    // console.timeEnd('generate')

    // tree.printStructure()
    try {
      tree.verify()
    } catch (e) {
      // exit if the tree is invalid
      console.error(e)
      console.log('INVALID TREE')
      writeFailure('verify', allIntervals)
      break
    }
    count++
    if (count % 1000 === 0) process.stdout.write('.')
    // tree.printStructure()
    // break
    // console.log('searching')
    // console.time('search')
    // searchIntervals()
    // console.timeEnd('search')

    // console.time('arraySearch')
    // searchArrayIntervals()
    // console.timeEnd('arraySearch')
  }
}

function writeFailure(type: string, allIntervals: Interval[]) {
  // write to a random file based on current time
  const date = new Date()
  const filename = `failure_${type}_${date.getTime()}.json`
  // write to file
  fs.writeFile(filename, JSON.stringify(allIntervals), (err: any) => {
    if (err) {
      console.error(err)
      return
    }
  })
}
benchmarkIntervals()
