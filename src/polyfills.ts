// Polyfill for Array.prototype.toSorted (ES2023)
// Required for Node 14 compatibility
if (!Array.prototype.toSorted) {
  // eslint-disable-next-line no-extend-native
  Array.prototype.toSorted = function <T>(this: T[], compareFn?: (a: T, b: T) => number): T[] {
    return this.slice().sort(compareFn)
  }
}

// Polyfill for Array.prototype.at (ES2022)
// Required for Node 14 compatibility
if (!Array.prototype.at) {
  // eslint-disable-next-line no-extend-native
  Array.prototype.at = function <T>(this: T[], index: number): T | undefined {
    const len = this.length
    const relativeIndex = index < 0 ? len + index : index
    if (relativeIndex < 0 || relativeIndex >= len) {
      return undefined
    }
    return this[relativeIndex]
  }
}

// Type augmentation for TypeScript
declare global {
  interface Array<T> {
    toSorted(compareFn?: (a: T, b: T) => number): T[]
    at(index: number): T | undefined
  }
}

export {}
