export class Interval {
  public start: number
  public end: number
  public data: any
  public length: number

  public static fromLength(length: number) {
    return new Interval(0, length)
  }

  public constructor(start: number, end: number, data?: Object) {
    this.start = start
    this.end = end
    this.data = data
    this.length = this.end - this.start
  }

  public toString() {
    return `Interval(${this.start}, ${this.end})` //, length=${this.length})`
  }

  public isNull() {
    return this.start >= this.end
  }

  // public length() {
  //   return this.end - this.start
  // }

  public containsPoint(point: number) {
    /*
      Whether the Interval contains point.
      :param point: a point
      :return: True or False
      :rtype: bool
    */
    return (this.start <= point) && (point < this.end)
  }

  public overlaps(start: number|Interval, end?: number):boolean {
    /*
    Whether the interval overlaps the given point, range or Interval.
    :param begin: beginning point of the range, or the point, or an Interval
    :param end: end point of the range. Optional if not testing ranges.
    :return: True or False
    :rtype: bool
    */
    if (end !== undefined) {
        return (
            (start <= this.start && this.start < end) ||
            (start < this.end && this.end <= end) ||
            (this.start <= start && start < this.end) ||
            (this.start < end && end <= this.end)
        )
    }
    if (typeof start === 'Interval') {
      let iv:Interval = start as Interval
      return this.overlaps(iv.start, iv.end)
    }
    return this.containsPoint(start as number)
  }
}
