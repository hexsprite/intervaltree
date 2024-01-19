import assert from 'assert'

export class Interval {
  public start: number
  public end: number
  public data: unknown
  public length: number

  public constructor(start: number, end: number, data?: unknown) {
    assert.equal(typeof start, 'number', `start not number: ${start}`)
    assert.equal(typeof end, 'number', `end not number: ${end}`)
    assert(!isNaN(start), 'start is NaN')
    assert(!isNaN(end), 'end is NaN')
    assert(
      start <= end,
      `start (${start}) must be less than or equal to end (${end})`
    )
    this.start = start
    this.end = end
    this.data = data
    this.length = this.end - this.start
  }

  public toString() {
    return (
      `Interval(${this.start}, ${this.end}` +
      (this.data ? `, ${this.data})` : ')')
    )
  }

  public containsPoint(point: number): boolean {
    /*
      Whether the Interval contains point.
    */
    return this.start <= point && point < this.end
  }

  public overlaps(start: number, end?: number): boolean {
    /*
    Whether the interval overlaps the given point, range or Interval.
    :param begin: beginning point of the range, or the point, or an Interval
    :param end: end point of the range. Optional if not testing ranges.
    */
    if (end !== undefined) {
      return start < this.end && this.start < end
    }
    return this.containsPoint(start)
  }
}
