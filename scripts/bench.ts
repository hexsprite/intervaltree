import fs from 'fs'
import { Interval } from '../src/Interval'
import { IntervalTree } from '../src/IntervalTree'

let tree = new IntervalTree()

const numIntervals = 100_000
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

function benchmarkIntervals() {
  console.time('generate')
  generateRandomIntervals(numIntervals)
  try {
    console.profile('generate')
    tree = new IntervalTree(allIntervals)
    console.profileEnd('generate')
  } catch (e) {
    console.error(e)
    console.log('INVALID INTERVALS')
    writeFailure('gen', allIntervals)
    return
  }
  console.timeEnd('generate')

  try {
    tree.verify()
  } catch (e) {
    // exit if the tree is invalid
    console.error(e)
    console.log('INVALID TREE')
    writeFailure('verify', allIntervals)
    return
  }

  console.log('searching')
  console.time('search')
  console.profile('search')
  searchIntervals()
  console.timeEnd('search')
  console.profileEnd('search')
  console.time('arraySearch')
  searchArrayIntervals()
  console.timeEnd('arraySearch')
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
