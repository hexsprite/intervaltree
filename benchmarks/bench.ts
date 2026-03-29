/* eslint-disable no-console */
import type { IntervalCollection } from '../src/IntervalCollection'
import fs from 'node:fs'
import { ArrayIntervalCollection } from '../src/ArrayIntervalCollection'
import { compareIntervals } from '../src/compareIntervals'
import { Interval } from '../src/Interval'
import { IntervalTree } from '../src/IntervalTree'

let tree = new IntervalTree()

const numIntervals = 10_000
const numQueries = 10_000
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
  allIntervals.sort(compareIntervals)
}

function searchIntervals(collection: IntervalCollection) {
  for (let i = 0; i < numQueries; i++) {
    const start = Math.floor(Math.random() * intervalRangeSize)
    collection.searchPoint(start)
  }
}

function main() {
  console.time('generate')
  generateRandomIntervals(numIntervals)
  console.timeEnd('generate')

  try {
    console.time('build tree')
    tree = new IntervalTree(allIntervals)
    // allIntervals.forEach((interval) => {
    //   tree.add(interval);
    // });
    console.timeEnd('build tree')
  }
  catch (e) {
    console.error(e)
    console.error('INVALID INTERVALS')
    writeFailure('gen', allIntervals)
    return
  }
  try {
    tree.verify()
  }
  catch (e) {
    // exit if the tree is invalid
    console.error(e)
    console.error('INVALID TREE')
    writeFailure('verify', allIntervals)
    return
  }

  console.time('build array')
  const array = new ArrayIntervalCollection(allIntervals)
  console.timeEnd('build array')

  console.log('searching')
  console.time('search')

  console.profile('search')
  searchIntervals(tree)
  console.timeEnd('search')
  console.profileEnd('search')

  console.time('arraySearch')
  searchIntervals(array)
  console.timeEnd('arraySearch')
}

function writeFailure(type: string, allIntervals: Interval[]) {
  // write to a random file based on current time
  const date = new Date()
  const filename = `failure_${type}_${date.getTime()}.json`
  // write to file
  fs.writeFileSync(filename, JSON.stringify(allIntervals))
}

main()
