- IntervalTree: change to `this.branch.left` instead of `this.getBranch(0)`

- support .valueOf() for points. This would natively allow the use of Date
  or moment objects as keys. Interchangably, so introducing new bugs needn't be
  a concern.

- some kind of doc generation system so we can have generated API docs

- logger should be imported cleanly (get rid of globals.d.ts ref)

- review other data structures for our purposes

  - https://github.com/hunt-genes/ncls
  - https://github.com/biocore-ntnu/pyranges

- benchmark 100million

- implement of IntervalTree<T> where T defines the data type ... must subclass or implement Interval

- DONE

  - use https://facebook.github.io/immutable-js/ instead of collection

  - collectionjs is horrible as it overrides ES6 Array functions among
    other things
  - https://github.com/facebook/immutable-js/issues/88
  - https://github.com/rongierlach/immutable-sorted-map
    - 5 years old
  - https://github.com/applitopia/immutable-sorted
  - https://www.npmjs.com/package/@collectable/sorted-set
    - weird API
    - not maintained
  - https://github.com/rimbu-org/rimbu
    - consistent updates in 2022
