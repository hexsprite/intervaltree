# Autoresearch Ideas

## Done ✓
- ~~updateAttributes() spread+map → for-loops~~
- ~~fromIntervals() O(n) bulk build~~
- ~~toArray() single result array~~
- ~~dirty flag for mergeOverlaps()~~
- ~~chop() simplification~~
- ~~insert() shared flag arrays~~
- ~~search methods for-loops + direct #branch~~
- ~~in-order toArray + skip redundant sorts~~

## Dead Ends
- Removing assert from Interval constructor — no effect
- Replacing #private fields with readonly public — actually slower
- Making searchByLengthStartingAt in-order — can't due to shouldSkipBranch pruning

## Remaining Ideas

### Performance (schedule loop is 66% of time now)
- **Avoid toSorted in searchByLengthStartingAt**: Currently does full sort after collecting results. Could sort values within each node at insert time so traversal yields sorted output, or use insertion sort since results are nearly sorted.
- **size as O(1) counter**: Currently O(n) via toArray().length. Not in benchmark hot path but used by Focuster.
- **first()/last() O(log n)**: Walk left/right instead of toSorted()[0] or toArray()[size-1]. Not in benchmark but used by Focuster.

### Init phase (34% of time now)
- **Use chopAll for batch event chopping**: Init chops 1000 events one by one. chopAll does a single linear sweep for >3 ranges. Should use it in bench and suggest for Focuster.

### Structural
- **Flatten node values array**: Most nodes have exactly 1 value. Store single interval directly, only use array for multi-value nodes.
- **In-place interval replacement in chop**: For single-interval chop where the left piece shares the same start, replace in-place instead of remove+add. Requires mutable intervals or node-level support.
- **Node pooling / recycling**: avoid GC pressure by reusing removed nodes
