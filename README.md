# intervaltree JS

A mutable, self-balancing interval tree ported from the [Python `intervaltree` package][python intervaltree package].

## Examples

- Getting started

  ```js
  import IntervalTree, { Interval } from 'intervaltree'
  const tree = new IntervalTree()
  ```

- Adding intervals

  ```js
  t.addInterval(1, 2, 'data for 1 through 2')
  t.add(new Interval(3, 4, 'data for 3 through 4'))
  ```

## Future improvements

See the [issue tracker][] on GitHub.

## Based on

- [Python intervaltree package][python intervaltree package]
- Eternally Confuzzled's [AVL tree][confuzzled avl tree]
- Wikipedia's [Interval Tree][wiki intervaltree]
- Heavily modified from Tyler Kahn's [Interval Tree implementation in Python][kahn intervaltree] ([GitHub project][kahn intervaltree gh])
- Incorporates contributions from:
  - [konstantint/Konstantin Tretyakov][konstantin intervaltree] of the University of Tartu (Estonia)
  - [siniG/Avi Gabay][sinig intervaltree]
  - [lmcarril/Luis M. Carril][lmcarril intervaltree] of the Karlsruhe Institute for Technology (Germany)

## Copyright

- [Jordan Baker][gh], 2016-now

The source code for this project is at https://github.com/hexsprite/intervaltree

[python intervaltree package]: https://github.com/chaimleib/intervaltree
[build status badge]: https://travis-ci.org/chaimleib/intervaltree.svg?branch=master
[build status]: https://travis-ci.org/chaimleib/intervaltree
[gh]: https://github.com/hexsprite/intervaltree
[issue tracker]: https://github.com/chaimleib/intervaltree/issues
[konstantin intervaltree]: https://github.com/konstantint/PyIntervalTree
[sinig intervaltree]: https://github.com/siniG/intervaltree
[lmcarril intervaltree]: https://github.com/lmcarril/intervaltree
[confuzzled avl tree]: http://www.eternallyconfuzzled.com/tuts/datastructures/jsw_tut_avl.aspx
[wiki intervaltree]: http://en.wikipedia.org/wiki/Interval_tree
[kahn intervaltree]: http://zurb.com/forrst/posts/Interval_Tree_implementation_in_python-e0K
[kahn intervaltree gh]: https://github.com/tylerkahn/intervaltree-python
[apache]: http://www.apache.org/licenses/LICENSE-2.0
