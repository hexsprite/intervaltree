- IntervalTree: change to `this.branch[0]` instead of `this.getBranch(0), and`this.branch[0] = x`instead of`this.setBranch(0, x)`

- support .valueOf() for points. This would natively allow the use of Date
  or moment objects as keys. Interchangably, so introducing new bugs needn't be
  a concern.

- some kind of doc generation system so we can have generated API docs

- use https://facebook.github.io/immutable-js/ instead of collection

  - collectionjs is horrible as it overrides ES6 Array functions among
    other things
  - https://github.com/facebook/immutable-js/issues/88
  - https://github.com/rongierlach/immutable-sorted-map
  - https://github.com/applitopia/immutable-sorted
  - https://www.npmjs.com/package/@collectable/sorted-set

- logger should be imported cleanly (get rid of globals.d.ts ref)
