declare module 'collections/sorted-set' {
  class Iterator<T> {
    public next(): { done: boolean, value: any }
  }
  class SortedSet<T> {
    public length: number

    constructor(intervals: [T] | SortedSet<T> | [ null | any],
                compare: Function, equals: Function)
    public add(v: T): null
    public addEach(l: SortedSet<T>|Array<T>): null
    public delete(v: T): null
    public filter(cb: (v: T) => void): SortedSet<T>
    public forEach(cb: (v: T) => void): null
    public has(v: T): boolean
    public iterator(): Iterator<T>
    public keysArray(): Array<T>
    public map(Function): Array<any>
    public remove(v: T): null
    public slice(): SortedSet<T>
    public sorted(cb: Function): SortedSet<T>
    public toArray(): Array<T>
   }
}
