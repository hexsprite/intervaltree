- support .valueOf() for points. This would natively allow the use of Date
  or moment objects as keys. Interchangably, so introducing new bugs needn't be
  a concern.

- some kind of doc generation system so we can have generated API docs.
Have ChatGPT generate the necessary JSDoc.

- logger should be imported cleanly (get rid of globals.d.ts ref)

- implement of IntervalTree<T> where T defines the data type ... must subclass or implement Interval

- compile time removal of debug() statements

- consider using babel-plugin-undebug, babel-plugin-unassert for production builds to remove overhead of those function calls.

