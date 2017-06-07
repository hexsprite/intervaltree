[![Build status badge][]][build status]

intervaltree
============

[![Greenkeeper badge](https://badges.greenkeeper.io/hexsprite/intervaltree.svg?token=aea6751002a064303361fddac5458cb3349c8c279c2bec3e02d4a1b88b787353&ts=1496850411833)](https://greenkeeper.io/)

A mutable, self-balancing interval tree for Python 2 and 3. Queries may be by point, by range overlap, or by range envelopment.

This library was designed to allow tagging text and time intervals, where the intervals include the lower bound but not the upper bound.

Installing
----------

```sh
pip install intervaltree
```

Features
--------

* Supports NodeJS and browsers
* Initializing

    * blank `tree = new IntervalTree()`
    <!-- * from an iterable of `Interval` objects (`tree = IntervalTree(intervals)`)
    * from an iterable of tuples (`tree = IntervalTree.from_tuples(interval_tuples)`) -->

* Insertions

    <!-- * `tree[begin:end] = data` -->
    * `tree.add(interval)`
    * `tree.addi(begin, end, data)`

* Deletions

    * `tree.remove(interval)`             (raises `ValueError` if not present)
    * `tree.discard(interval)`            (quiet if not present)
    * `tree.removei(begin, end, data)`    (short for `tree.remove(Interval(begin, end, data))`)
    * `tree.discardi(begin, end, data)`   (short for `tree.discard(Interval(begin, end, data))`)
    * `tree.remove_overlap(point)`
    * `tree.remove_overlap(begin, end)`   (removes all overlapping the range)
    * `tree.remove_envelop(begin, end)`   (removes all enveloped in the range)

* Overlap queries

    * `tree[point]`
    * `tree[begin:end]`
    * `tree.search(point)`
    * `tree.search(begin, end)`

* Envelop queries

    * `tree.search(begin, end, strict=True)`

* Membership queries

    * `interval_obj in tree`              (this is fastest, O(1))
    * `tree.containsi(begin, end, data)`
    * `tree.overlaps(point)`
    * `tree.overlaps(begin, end)`

* Iterable

    * `for interval_obj in tree:`
    * `tree.items()`

* Sizing

    * `len(tree)`
    * `tree.is_empty()`
    * `not tree`
    * `tree.begin()`          (the `begin` coordinate of the leftmost interval)
    * `tree.end()`            (the `end` coordinate of the rightmost interval)

* Set-like operations

    * union

        * `result_tree = tree.union(iterable)`
        * `result_tree = tree1 | tree2`        
        * `tree.update(iterable)`
        * `tree |= other_tree`

    * difference

        * `result_tree = tree.difference(iterable)`
        * `result_tree = tree1 - tree2`
        * `tree.difference_update(iterable)`
        * `tree -= other_tree`

    * intersection

        * `result_tree = tree.intersection(iterable)`
        * `result_tree = tree1 & tree2`    
        * `tree.intersection_update(iterable)`
        * `tree &= other_tree`

    * symmetric difference

        * `result_tree = tree.symmetric_difference(iterable)`
        * `result_tree = tree1 ^ tree2`
        * `tree.symmetric_difference_update(iterable)`
        * `tree ^= other_tree`

    * comparison

        * `tree1.issubset(tree2)` or `tree1 <= tree2`
        * `tree1 <= tree2`
        * `tree1.issuperset(tree2)` or `tree1 > tree2`
        * `tree1 >= tree2`
        * `tree1 == tree2`

* Restructuring

    * `chop(begin, end)`      (slice intervals and remove everything between `begin` and `end`)
    * `slice(point)`          (slice intervals at `point`)
    * `split_overlaps()`      (slice at all interval boundaries)

* Copying and typecasting

    * `IntervalTree(tree)`    (`Interval` objects are same as those in tree)
    * `tree.copy()`           (`Interval` objects are shallow copies of those in tree)
    * `set(tree)`             (can later be fed into `IntervalTree()`)
    * `list(tree)`            (ditto)

* Pickle-friendly
* Automatic AVL balancing

Examples
--------

* Getting started

    ``` python
    >>> from intervaltree import Interval, IntervalTree
    >>> t = IntervalTree()
    >>> t
    IntervalTree()

    ```

* Adding intervals - any object works!

    ``` python
    >>> t[1:2] = "1-2"
    >>> t[4:7] = (4, 7)
    >>> t[5:9] = {5: 9}

    ```

* Query by point

    The result of a query is a `set` object, so if ordering is important,
    you must sort it first.

    ``` python
    >>> sorted(t[6])
    [Interval(4, 7, (4, 7)), Interval(5, 9, {5: 9})]
    >>> sorted(t[6])[0]
    Interval(4, 7, (4, 7))

    ```

* Query by range

    Note that ranges are inclusive of the lower limit, but non-inclusive of the upper limit. So:

    ``` python
    >>> sorted(t[2:4])
    []

    ```

    But:

    ``` python
    >>> sorted(t[1:5])
    [Interval(1, 2, '1-2'), Interval(4, 7, (4, 7))]

    ```

* Accessing an `Interval` object

    ``` python
    >>> iv = Interval(4, 7, (4, 7))
    >>> iv.begin
    4
    >>> iv.end
    7
    >>> iv.data
    (4, 7)

    >>> begin, end, data = iv
    >>> begin
    4
    >>> end
    7
    >>> data
    (4, 7)

    ```

* Constructing from lists of intervals

    We could have made a similar tree this way:

    ``` python
    >>> ivs = [(1, 2), (4, 7), (5, 9)]
    >>> t = IntervalTree(
    ...    Interval(begin, end, "%d-%d" % (begin, end)) for begin, end in ivs
    ... )

    ```

    Or, if we don't need the data fields:

    ``` python
    >>> t2 = IntervalTree(Interval(*iv) for iv in ivs)

    ```

* Removing intervals

    ``` python
    >>> t.remove( Interval(1, 2, "1-2") )
    >>> sorted(t)
    [Interval(4, 7, '4-7'), Interval(5, 9, '5-9')]

    >>> t.remove( Interval(500, 1000, "Doesn't exist"))  # raises ValueError
    Traceback (most recent call last):
    ValueError

    >>> t.discard(Interval(500, 1000, "Doesn't exist"))  # quietly does nothing

    >>> del t[5]  # same as t.remove_overlap(5)
    >>> t
    IntervalTree()

    ```

    We could also empty a tree entirely:

    ``` python
    >>> t2.clear()
    >>> t2
    IntervalTree()

    ```

    Or remove intervals that overlap a range:

    ``` python
    >>> t = IntervalTree([
    ...     Interval(0, 10),
    ...     Interval(10, 20),
    ...     Interval(20, 30),
    ...     Interval(30, 40)])
    >>> t.remove_overlap(25, 35)
    >>> sorted(t)
    [Interval(0, 10), Interval(10, 20)]

    ```

    We can also remove only those intervals completely enveloped in a range:

    ``` python
    >>> t.remove_envelop(5, 20)
    >>> sorted(t)
    [Interval(0, 10)]

    ```

* Chopping

    We could also chop out parts of the tree:

    ``` python
    >>> t = IntervalTree([Interval(0, 10)])
    >>> t.chop(3, 7)
    >>> sorted(t)
    [Interval(0, 3), Interval(7, 10)]

    ```

    To modify the new intervals' data fields based on which side of the interval is being chopped:

    ``` python
    >>> def datafunc(iv, islower):
    ...     oldlimit = iv[islower]
    ...     return "oldlimit: {0}, islower: {1}".format(oldlimit, islower)
    >>> t = IntervalTree([Interval(0, 10)])
    >>> t.chop(3, 7, datafunc)
    >>> sorted(t)[0]
    Interval(0, 3, 'oldlimit: 10, islower: True')
    >>> sorted(t)[1]
    Interval(7, 10, 'oldlimit: 0, islower: False')

    ```

* Slicing

    You can also slice intervals in the tree without removing them:

    ``` python
    >>> t = IntervalTree([Interval(0, 10), Interval(5, 15)])
    >>> t.slice(3)
    >>> sorted(t)
    [Interval(0, 3), Interval(3, 10), Interval(5, 15)]

    ```

    You can also set the data fields, for example, re-using `datafunc()` from above:

    ``` python
    >>> t = IntervalTree([Interval(5, 15)])
    >>> t.slice(10, datafunc)
    >>> sorted(t)[0]
    Interval(5, 10, 'oldlimit: 15, islower: True')
    >>> sorted(t)[1]
    Interval(10, 15, 'oldlimit: 5, islower: False')

    ```

Future improvements
-------------------

See the [issue tracker][] on GitHub.

Based on
--------

* Eternally Confuzzled's [AVL tree][Confuzzled AVL tree]
* Wikipedia's [Interval Tree][Wiki intervaltree]
* Heavily modified from Tyler Kahn's [Interval Tree implementation in Python][Kahn intervaltree] ([GitHub project][Kahn intervaltree GH])
* Incorporates contributions from:
    * [konstantint/Konstantin Tretyakov][Konstantin intervaltree] of the University of Tartu (Estonia)
    * [siniG/Avi Gabay][siniG intervaltree]
    * [lmcarril/Luis M. Carril][lmcarril intervaltree] of the Karlsruhe Institute for Technology (Germany)

Copyright
---------

* [Chaim-Leib Halbert][GH], 2013-2015
* Modifications, [Konstantin Tretyakov][Konstantin intervaltree], 2014

Licensed under the [Apache License, version 2.0][Apache].

The source code for this project is at https://github.com/chaimleib/intervaltree


[build status badge]: https://travis-ci.org/chaimleib/intervaltree.svg?branch=master
[build status]: https://travis-ci.org/chaimleib/intervaltree
[GH]: https://github.com/chaimleib/intervaltree
[issue tracker]: https://github.com/chaimleib/intervaltree/issues
[Konstantin intervaltree]: https://github.com/konstantint/PyIntervalTree
[siniG intervaltree]: https://github.com/siniG/intervaltree
[lmcarril intervaltree]: https://github.com/lmcarril/intervaltree
[Confuzzled AVL tree]: http://www.eternallyconfuzzled.com/tuts/datastructures/jsw_tut_avl.aspx
[Wiki intervaltree]: http://en.wikipedia.org/wiki/Interval_tree
[Kahn intervaltree]: http://zurb.com/forrst/posts/Interval_Tree_implementation_in_python-e0K
[Kahn intervaltree GH]: https://github.com/tylerkahn/intervaltree-python
[Apache]: http://www.apache.org/licenses/LICENSE-2.0



# ts-library-starter
[![NPM version](https://img.shields.io/npm/v/ts-library-starter.svg)](https://www.npmjs.com/package/ts-library-starter)
[![Build Status](https://travis-ci.org/DxCx/ts-library-starter.svg?branch=master)](https://travis-ci.org/DxCx/ts-library-starter)
[![Coverage Status](https://coveralls.io/repos/github/DxCx/ts-library-starter/badge.svg?branch=master)](https://coveralls.io/github/DxCx/ts-library-starter?branch=master)
[![Standard Version](https://img.shields.io/badge/release-standard%20version-brightgreen.svg)](https://github.com/conventional-changelog/standard-version)

Example git project that is used for typescript libraries as a starter pack

What does it include:
----
    1. exported class as example for an npm moudle
    2. packaging for npm modules (webpack + tslint + awesome-typescript-loader + dts-bundle)
    3. testings for npm modules (jest)
    4. code coverage (jest) when running tests
    5. Typescript => ES6 => ES5 (babel)
    6. Two versions embed in the package, one for node, one for browser (browserify)

Notes
----
Please note that you will need to rename the library name in some files:

    1. webpack.config.js (bundle_opts)
    2. package.json (ofcourse ;))
Also don't forget to reset package version ;)

Useful commands:
----
    npm run prebuild       - install NPM dependancies
    npm run build          - build the library files
    npm run test           - run the tests
    npm run test:watch     - run the tests (watch-mode)
    npm run coverage       - run the tests with coverage
    npm run coverage:watch - run the tests with coverage (watch-mode)
    npm run pack           - build the library, make sure the tests passes, and then pack the library (creates .tgz)
    npm run release        - prepare package for next release

Files explained:
----
    1. src - directory is used for typescript code that is part of the project
        1a. src/Example.ts - Just an example exported library, used to should import in tests.
        1b. src/Example.spec.ts - tests for the example class
        1c. src/index.ts        - index, which functionality is exported from the library
        1d. src/main.ts         - just wrapper for index
    3. package.json                 - file is used to describe the library
    4. tsconfig.json                - configuration file for the library compilation
    6. tslint.json                  - configuration file for the linter (both test and library)
    8. webpack.config.js            - configuration file of the compilation automation process for the library

Output files explained:
----
    1. node_modules                       - directory npm creates with all the dependencies of the module (result of npm install)
    2. dist                               - directory contains the compiled library (javascript + typings)
    3. <module_name>-<module_version>.tgz - final tgz file for publish. (result of npm run pack)
    4. coverage                           - code coverage report output made by istanbul
