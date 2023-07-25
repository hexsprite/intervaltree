- Query by point

  The result of a query is a `set` object, so if ordering is important,
  you must sort it first.

  ```python
  >>> sorted(t[6])
  [Interval(4, 7, (4, 7)), Interval(5, 9, {5: 9})]
  >>> sorted(t[6])[0]
  Interval(4, 7, (4, 7))

  ```

- Query by range

  Note that ranges are inclusive of the lower limit, but non-inclusive of the upper limit. So:

  ```python
  >>> sorted(t[2:4])
  []

  ```

  But:

  ```python
  >>> sorted(t[1:5])
  [Interval(1, 2, '1-2'), Interval(4, 7, (4, 7))]

  ```

- Accessing an `Interval` object

  ```python
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

- Constructing from lists of intervals

  We could have made a similar tree this way:

  ```python
  >>> ivs = [(1, 2), (4, 7), (5, 9)]
  >>> t = IntervalTree(
  ...    Interval(begin, end, "%d-%d" % (begin, end)) for begin, end in ivs
  ... )

  ```

  Or, if we don't need the data fields:

  ```python
  >>> t2 = IntervalTree(Interval(*iv) for iv in ivs)

  ```

- Removing intervals

  ```python
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

  ```python
  >>> t2.clear()
  >>> t2
  IntervalTree()

  ```

  Or remove intervals that overlap a range:

  ```python
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

  ```python
  >>> t.remove_envelop(5, 20)
  >>> sorted(t)
  [Interval(0, 10)]

  ```

- Chopping

  We could also chop out parts of the tree:

  ```python
  >>> t = IntervalTree([Interval(0, 10)])
  >>> t.chop(3, 7)
  >>> sorted(t)
  [Interval(0, 3), Interval(7, 10)]

  ```

  To modify the new intervals' data fields based on which side of the interval is being chopped:

  ```python
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

- Slicing

  You can also slice intervals in the tree without removing them:

  ```python
  >>> t = IntervalTree([Interval(0, 10), Interval(5, 15)])
  >>> t.slice(3)
  >>> sorted(t)
  [Interval(0, 3), Interval(3, 10), Interval(5, 15)]

  ```

  You can also set the data fields, for example, re-using `datafunc()` from above:

  ```python
  >>> t = IntervalTree([Interval(5, 15)])
  >>> t.slice(10, datafunc)
  >>> sorted(t)[0]
  Interval(5, 10, 'oldlimit: 15, islower: True')
  >>> sorted(t)[1]
  Interval(10, 15, 'oldlimit: 5, islower: False')

  ```
