- Coverage
    
    - npm run coverage works but there are sourcemap problems
    
- IntervalTree: change to `this.branch[0]` instead of `this.getBranch(0), and
`this.branch[0] = x` instead of `this.setBranch(0, x)`

- support .valueOf() for points. This would natively allow the use of Date
or moment objects as keys. Interchangably, so introducing new bugs needn't be
a concern.

- some kind of doc generation system so we can have generated API docs

- use https://facebook.github.io/immutable-js/ instead of collection