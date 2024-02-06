export class BoundaryTable {
  #keys: Array<number> = []
  #values: Map<number, number> = new Map()

  public get keys(): Array<number> {
    return this.#keys
  }

  public get size(): number {
    return this.#keys.length
  }

  // Efficiently find the correct position for the new key using binary search
  findInsertPosition(key: number) {
    let low = 0
    let high = this.#keys.length - 1

    while (low <= high) {
      const mid = Math.floor((low + high) / 2)
      const midKey = this.#keys[mid]
      if (midKey < key) {
        low = mid + 1
      } else if (midKey > key) {
        high = mid - 1
      } else {
        return mid // Key already exists
      }
    }

    return low // Position where the key should be inserted
  }

  // Insert or update the key-value pair, keeping the keys sorted
  set(key: number, value: number) {
    const pos = this.findInsertPosition(key)

    // If key does not exist, insert it in the correct position
    if (this.#keys[pos] !== key) {
      this.#keys.splice(pos, 0, key)
    }

    this.#values.set(key, value)
  }

  // Increment the value of a given key
  increment(key: number, amount = 1) {
    const current = this.#values.get(key) || 0
    this.set(key, current + amount)
  }

  get(key: number) {
    return this.#values.get(key)
  }

  delete(key: number) {
    const pos = this.findInsertPosition(key)
    if (this.keys[pos] === key) {
      this.keys.splice(pos, 1)
      return this.#values.delete(key)
    }
    return false
  }

  has(key: number) {
    return this.#values.has(key)
  }

  difference(other: BoundaryTable) {
    const diff = new BoundaryTable()
    for (const key of this.keys) {
      if (!other.has(key)) {
        diff.set(key, this.get(key)!)
      }
    }
    return diff
  }
}
