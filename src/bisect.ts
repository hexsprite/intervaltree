let SortedSet = require('collections/sorted-set')

// based on python's bisect left algorithm
export function bisectLeft(a: Array<number>, x:number, lo:number=0,
                           hi:number=a.length)
{
  
  while (lo < hi) {
      let mid = Math.floor((lo+hi) / 2)
      if (a[mid] < x) {
        lo = mid + 1
      } else {
        hi = mid
      }
  }
  return lo
}
