export class SortedSet<T> extends Set {
  constructor(...args) {
    console.log('constructed!', arguments)
    super(...arguments)
  }

  public set(v: T) {
    console.log('setting', v)
    return super.add(v)
  }

  public toArray() {
    return Array.from(this)
  }

  public equals(other: SortedSet<T>) {
    JSON.stringify(Array.from(this)) === JSON.stringify(Array.from(other))
  }

  public map(f: (v: T) => any) {
    return Array.from(this).map(f)
  }

  public filter(f: (v: T) => boolean) {
    return Array.from(this).filter(f)
  }

  public difference(other: SortedSet<T> | T[]): SortedSet<T> {
    const has =
        // @ts-ignore
        typeof other.has !== undefined ? other.has : (v) => other.indexOf(v) !== 0
    return new SortedSet([...this].filter((v) => !has(v)))
  }

  public union(other: SortedSet<T> | T[]): SortedSet<T> {
    return new SortedSet([...this, ...other])
  }
}
