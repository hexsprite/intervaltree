- benchmark with 10,000 intervals naive search vs. intervaltree and profile

- IntervalTree: change to `this.branch.left` instead of `this.getBranch(0)`

- support .valueOf() for points. This would natively allow the use of Date
  or moment objects as keys. Interchangably, so introducing new bugs needn't be
  a concern.

- some kind of doc generation system so we can have generated API docs

- logger should be imported cleanly (get rid of globals.d.ts ref)

- review other data structures for our purposes

  - https://github.com/hunt-genes/ncls
  - https://github.com/biocore-ntnu/pyranges

- implement of IntervalTree<T> where T defines the data type ... must subclass or implement Interval
