Build

- tsup bundling
- logging production build disable with esbuild

Logging

- use DEBUG: label to selectively compile out logging/verify

API

- support .valueOf() for points. This would natively allow the use of Date
  or moment objects as keys. Interchangably, so introducing new bugs needn't be
  a concern.

Performance

- Add a Benchmark section in the docs
- check out benchmarkify
- profile heap size
- optimize for tree creation, chop, findFirstByLengthStartingAt

TypeScript

- implement of IntervalTree<T> where T defines the data type ... must subclass or implement Interval
- getBranch should really indicate that it COULD be null, prune also

Testing

- full suite of property based tests
- implement model based tests for fastCheck to test various operations of add/remove/search/chop/etc
- should work with bun test for speed ideally but issues with fast-check hanging

Docs
- public typedoc: https://github.com/TypeStrong/typedoc/issues/1485#issuecomment-1796185086


Indented logging to better see the sequence of events (based on Node depth)

<Node xCenter=123><spaces by depth><message><attributes>

when Node is hovered you can see its attributes in more detail

