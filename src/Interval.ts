export class Interval {
  public start: number
  public end: number
  public data: any

  public constructor(start: number, end: number, data?: Object) {
    this.start = start
    this.end = end
    this.data = data
  }

  public toString() {
    return `Interval(${this.start}, ${this.end})`
  }

  public isNull() {
    return this.start >= this.end
  }

  public length() {
    return this.end - this.start
  }

  public containsPoint(point: number) {
    /*
      Whether the Interval contains point.
      :param point: a point
      :return: True or False
      :rtype: bool
    */
    return (this.start <= point) && (point < this.end)
  }

  /* comparison interface for collectionsjs */
  public static equals(a: Interval, b: Interval) {
    return (a.start === b.start) && (a.end === b.end)
  }

  public static compare(a: Interval, b: Interval) {
    // compare so that it first compares using start then end
    if (a.start < b.start) {
      return -1
    } else if (a.start > b.start) {
      return 1
    } else {
      if (a.end < b.end) {
        return -1
      } else if (a.end > b.end) {
        return 1
      }
    }
    return 0
  }
}
