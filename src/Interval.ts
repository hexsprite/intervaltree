import assert from 'node:assert'
import type { IntervalTuple } from './types'

export class Interval {
  #start: number
  #end: number
  #data: unknown

  public constructor(start: number, end: number, data?: unknown) {
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

  get data(): unknown {
    return this.#data
  }

  get length(): number {
    return this.end - this.start
  }

  public static fromLength(length: number) {
    return new Interval(0, length)
  }

  equals(interval: Interval): boolean {
    return (
      this.start === interval.start
      && this.end === interval.end
      && this.data === interval.data
    )
  }

  toTuple(): IntervalTuple {
    return [
      this.start,
      this.end,
      ...(this.data ? [this.data] : []),
    ] as IntervalTuple
  }

  public toString() {
    return `Interval(${this.start}, ${this.end}, length=${this.length}${this.data ? `, data=${this.data}` : ''})`
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
