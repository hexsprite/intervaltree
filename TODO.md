Build

- tsup bundling
- logging production build disable with esbuild

Logging

- pino logging for improved diagnostics
- logger should be imported cleanly (get rid of globals.d.ts ref)
- use DEBUG: label to selectively compile out logging/verify

API

- support .valueOf() for points. This would natively allow the use of Date
  or moment objects as keys. Interchangably, so introducing new bugs needn't be
  a concern.

- some kind of doc generation system so we can have generated API docs. Have ChatGPT generate the necessary JSDoc.

Performance

- profile heap size
- optimize for tree creation, chop, findFirstByLengthStartingAt

TypeScript

- implement of IntervalTree<T> where T defines the data type ... must subclass or implement Interval

Testing

- full suite of property based tests
- should work with bun test for speed ideally but issues with fast-check hanging

