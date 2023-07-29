import { Interval } from "./src/Interval";
import { IntervalTree } from "./src/IntervalTree";

const tree = new IntervalTree();

const numIntervals = 100_000;
const intervalRangeSize = 1_000_000;

function generateRandomIntervals(numIntervals: number) {
  for (let i = 0; i < numIntervals; i++) {
    const start = Math.floor(Math.random() * intervalRangeSize);
    const end = start + Math.floor(Math.random() * 1000) + 1; // Ensure end > start
    tree.add(new Interval(start, end));
  }
}

function searchIntervals(numIntervals: number) {
    for (let i = 0; i < numIntervals; i++) {
        const start = Math.floor(Math.random() * intervalRangeSize);
        tree.search(start);
    }
}

function benchmarkIntervals() {
  console.time("intervalSearch");
  console.time('generate')
  generateRandomIntervals(numIntervals);
  console.timeEnd('generate')
  console.time('search')
  searchIntervals(numIntervals);
  console.timeEnd('search')
  console.timeEnd("intervalSearch");
}

benchmarkIntervals();
