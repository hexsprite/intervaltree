/* tslint:disable max-classes-per-file */
declare module 'collections/sorted-set' {
  class Iterator<T> {
    public next(): { done: boolean; value: any }
  }
  export class SortedSet<T> {
    public length: number
    constructor(
      intervals?: T[] | SortedSet<T>,
      equals?: (a: T, b: T) => boolean,
      compare?: (a: T, b: T) => number
    )
    public add(v: T): null
    public addEach(l: SortedSet<T> | T[]): null
    public clone(): SortedSet<T>
    public delete(v: T): null
    public difference(a: SortedSet<T>): SortedSet<T>
    public equals(a: SortedSet<T>): boolean
    public filter(cb: (v: T) => void): SortedSet<T>
    public forEach(cb: (v: T) => void): null
    public has(v: T): boolean
    public iterator(): Iterator<T>
    public keysArray(): T[]
    public map(Function): any[]
    public pop(): T
    public remove(v: T): null
    public slice(): SortedSet<T>
    public sorted(cb?: (a: T, b: T) => number): SortedSet<T>
    public toArray(): T[]
    public union(a: any): SortedSet<T>
  }
}
