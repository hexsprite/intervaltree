export function bisectLeft(
  a: number[],
  x: number,
  lo: number = 0,
  hi: number = a.length
) {
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2)
    if (a[mid] < x) {
      lo = mid + 1
    } else {
      hi = mid
    }
  }
  return lo
}
