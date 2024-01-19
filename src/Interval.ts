import assert from 'assert'

/**
 * Represents an interval with a start and end point.
 */
export class Interval {
  /**
   * The start point of the interval.
   */
  public start: number
  /**
   * The end point of the interval.
   */
  public end: number
  /**
   * Additional data associated with the interval.
   */
  public data: unknown

  /**
   * Creates a new Interval instance.
   * @param start - The start point of the interval.
   * @param end - The end point of the interval.
   * @param data - Additional data associated with the interval.
   */
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
  }

  /**
   * The length of the interval (end - start).
   */
  public get length() {
    return this.end - this.start
  }

  /**
   * Returns a string representation of the interval.
   * @returns A string representation of the interval.
   */
  public toString() {
    return (
      `Interval(${this.start}, ${this.end}` +
      (this.data ? `, ${this.data})` : ')')
    )
  }

  /**
   * Checks if the interval contains a given point.
   * @param point - The point to check.
   * @returns True if the interval contains the point, false otherwise.
   */
  public containsPoint(point: number): boolean {
    return this.start <= point && point < this.end
  }

  /**
   * Checks if the interval overlaps with a given range or interval.
   * @param start - The beginning point of the range, or the point, or an Interval.
   * @param end - The end point of the range. Optional if not testing ranges.
   * @returns True if the interval overlaps with the range or interval, false otherwise.
   */
  public overlaps(start: number, end?: number): boolean {
    if (end !== undefined) {
      return start < this.end && this.start < end
    }
    return this.containsPoint(start)
  }
}
