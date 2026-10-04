# Glossary

intervaltree is a generic interval library. Busy time and free time are caller
interpretations of the same data structure, used in scheduling examples.

| Term | Meaning |
| --- | --- |
| Interval | An immutable half-open stretch `[start, end)` with optional data. Stored intervals always have `start < end`. |
| Bounds | The inclusive start and exclusive end of an interval or query window. |
| Data | The caller's payload. Together with the bounds, its identity determines interval equality. |
| Window | The bounds passed to a query or mutation. An empty window stores nothing; `chop` and `chopAll` treat it as a no-op. |
| Gap | A maximal part of a window covered by no stored interval. It has no source data. |
| Busy interval | A stored interval interpreted as occupied time by a caller. |
| Free slot | A stored interval interpreted as open time by a caller. |
| Overlap | Sharing at least one point. Touching intervals do not overlap. |
| Touch | One interval's end equals the other's start. |
| Merge | Replacing a run of overlapping or touching intervals with one interval. |
| Chop | Cutting a window out of every stored interval, keeping the surviving fragments and their data. |
| Envelop | A window envelops an interval when the interval lies wholly inside it. |
| Contain | An interval contains a point `p` when `start <= p < end`. |
| Canonical order | Ascending start, then end, of returned bounds. Order among identical bounds with different data is unspecified. |
| Merged tree | A tree known to have no overlapping or touching intervals. Removing or chopping intervals preserves that property. |
| Record union | All distinct intervals from two collections, retaining their data. |
| Range union | Record union followed by merging overlapping and touching intervals. |

Length queries search stored intervals with enough length remaining after a
point. They never discover gaps or implicitly merge touching intervals.
Call `mergeOverlaps()` first when touching free slots should count as one.
For a busy-time collection, compute a window's complement with `difference`
before asking a length query for free time.

`gaps` remains an experimental free function in `src/gaps.ts`, operating on
`IntervalCollection`. It belongs outside the storage core; a scheduling
wrapper can be considered if another caller needs booking semantics.
