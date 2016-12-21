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
}
