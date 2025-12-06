import type { IntervalTuple } from './types'
import assert from 'node:assert'

export class Interval<T = unknown> {
  #start: number
  #end: number
  #data: T | undefined

  public constructor(start: number, end: number, data?: T) {
    assert.equal(typeof start, 'number', `start not number: ${start}`)
    assert.equal(typeof end, 'number', `end not number: ${end}`)
    assert(start < end, 'invalid null range')

    this.#start = start
    this.#end = end
    this.#data = data
  }

  get start(): number {
    return this.#start
  }

  get end(): number {
    return this.#end
  }

  get data(): T | undefined {
    return this.#data
  }

  get length(): number {
    return this.end - this.start
  }

  public static fromLength(length: number) {
    return new Interval(0, length)
  }

  equals(interval: Interval<T>): boolean {
    return (
      this.start === interval.start
      && this.end === interval.end
      && this.data === interval.data
    )
  }

  toTuple(): IntervalTuple<T> {
    return [
      this.start,
      this.end,
      ...(this.data !== undefined ? [this.data] : []),
    ] as IntervalTuple<T>
  }

  public toString() {
    return `Interval(${this.start}, ${this.end}, length=${this.length}${this.data !== undefined ? `, data=${this.data}` : ''})`
  }

  public containsPoint(point: number): boolean {
    /*
      Whether the Interval contains point.
    */
    return this.start <= point && point < this.end
  }

  overlapsWith(start: number, end: number): boolean {
    return this.start < end && this.end > start
  }
}
