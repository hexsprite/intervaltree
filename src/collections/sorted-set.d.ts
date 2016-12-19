declare module 'collections/sorted-set' {
  class SortedSet<T> {
    public length: number

    constructor(intervals:[T], compare: Function, equals: Function)
    add(v:T):null
    has(v:T):boolean
    toArray():Array<T>
    forEach(cb: (v:T) => void):null
    delete(v:T):null
    filter(cb: (v:T) => void):SortedSet<T>
    keysArray():Array<T>
    addEach(l:SortedSet<T>|Array<T>):null
    iterator():Iterator<T>
    remove(v:T):null
   }
}