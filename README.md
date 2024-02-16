# intervaltree JS

A mutable, self-balancing interval tree.

Written in TypeScript with no external dependendencies

## Install

```
npm install intervaltree
```

## Examples

- Instantiating

```js
import { Interval, IntervalTree } from 'intervaltree'
const tree = new IntervalTree()
```

- Adding intervals

```js
tree.addInterval(1, 2, 'data for 1 through 2')
tree.add(new Interval(3, 4, 'data for 3 through 4'))
```

- Search

```js
tree.searchPoint(3)
tree.searchOverlap(1, 3)
tree.searchByLengthStartingAt(2, 1)
tree.findOneByLengthStartingAt(2, 1)
```
