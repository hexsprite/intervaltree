import { Interval } from './Interval'

const intervalHash = (iv: Interval) => {
  return `${iv.start},${iv.end},${iv.data}`
}

export class IntervalHashSet {
  private intervalsMap: Map<string, Interval>

  constructor(intervals: Interval[]) {
    this.intervalsMap = new Map()
    this.addAll(intervals)
  }

  get size() {
    return this.intervalsMap.size
  }

  add(interval: Interval) {
    const hash = intervalHash(interval)
    this.intervalsMap.set(hash, interval)
  }

  remove(interval: Interval) {
    const hash = intervalHash(interval)
    this.intervalsMap.delete(hash)
    return this
  }

  has(interval: Interval) {
    const hash = intervalHash(interval)
    return this.intervalsMap.has(hash)
  }

  filter(fn: (interval: Interval) => boolean) {
    const result: Interval[] = []
    for (const interval of this.intervalsMap.values()) {
      if (fn(interval)) {
        result.push(interval)
      }
    }
    return result
  }

  map<T>(fn: (interval: Interval) => T) {
    const result: T[] = []
    for (const interval of this.intervalsMap.values()) {
      result.push(fn(interval))
    }
    return result
  }

  forEach(fn: (interval: Interval) => void) {
    for (const interval of this.intervalsMap.values()) {
      fn(interval)
    }
  }

  difference(other: IntervalHashSet) {
    const result = new IntervalHashSet([])
    for (const interval of this.intervalsMap.values()) {
      if (!other.has(interval)) {
        result.add(interval)
      }
    }
    return result
  }

  addAll(intervals: Interval[]) {
    for (const interval of intervals) {
      this.add(interval)
    }
    return this
  }

  toArray(): Interval[] {
    return [...this.intervalsMap.values()]
  }

  toSorted(sortFn: (a: Interval, b: Interval) => number) {
    return this.toArray().sort(sortFn)
  }

  toString() {
    return this.toArray().join(', ')
  }
}
