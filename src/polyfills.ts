// Polyfill for Array.prototype.toSorted (ES2023)
// Required for Node 14 compatibility
if (!Array.prototype.toSorted) {
  // eslint-disable-next-line no-extend-native
  Array.prototype.toSorted = function <T>(this: T[], compareFn?: (a: T, b: T) => number): T[] {
    return this.slice().sort(compareFn)
  }
}

// Type augmentation for TypeScript
declare global {
  interface Array<T> {
    toSorted: (compareFn?: (a: T, b: T) => number) => T[]
  }
}

export {}
