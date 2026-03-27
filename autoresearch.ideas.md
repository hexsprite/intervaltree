# Autoresearch Ideas

## Dead Ends (tried, no gain)
- Removing assert from Interval constructor — no effect
- Replacing #private fields with readonly public — actually slower  
- Insertion sort for searchByLengthStartingAt — V8 Timsort is faster
- Fast-path chop for single overlap — no improvement, tree ops dominate
- Eliminate intermediate arrays in chop — no improvement
- Optimize rotation methods with direct #branch — rotations too infrequent
- Optimize _buildBalanced dedup — slight regression

## Remaining Ideas

### Schedule loop (85% of time, ~12.8ms for 1500 iters)
- **Flatten node values array**: Most nodes have exactly 1 value. Store single interval directly on the node, only use array for multi-value nodes. Saves array indirection in every hot path.
- **In-place interval replacement in chop**: For single-interval chop where the left piece shares the same start, modify the node's value in-place instead of remove+add. Avoids 2 tree walks.
- **Avoid Interval allocation in findFirstByLengthStartingAt**: Return original interval and let caller adjust, avoiding `new Interval(startingAt, end)`.
- **Combine findFirst + chop into single tree walk**: Since schedule loop always does findFirst then chop on the result, a combined operation could avoid the redundant searchOverlap in chop.

### Init phase (15% of time, ~2.5ms)
- Already using chopAll — not much left here.

### Structural (bigger changes)
- **Node pooling / recycling**: Avoid GC pressure by reusing removed nodes
- **Flat array-based tree**: Store nodes in a contiguous array for cache locality instead of heap-allocated objects
