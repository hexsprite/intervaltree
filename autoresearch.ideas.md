# Autoresearch Ideas

## Dead Ends (confirmed, don't retry)
- Removing assert from Interval constructor — no effect
- Replacing #private with readonly public on Interval — V8 optimizes private+getters better (confirmed 2x)
- Insertion sort for searchByLengthStartingAt — V8 Timsort is faster
- Fast-path chop for single overlap — no improvement
- Eliminate intermediate arrays in chop — no improvement
- Optimize rotation methods with direct #branch — too infrequent
- Optimize _buildBalanced dedup — regression
- chopKnownInterval + findFirstRaw to skip searchOverlap — within noise
- Replace assert with if-throw — no improvement
- In-place replaceInterval in chop — correctness issues (duplicates), complexity not worth ~5%

## Remaining Ideas (diminishing returns territory)

### Structural (bigger, riskier changes)
- **Node pooling / recycling**: Avoid GC pressure by reusing removed nodes. Would need a free list.
- **Flat array-based tree**: Store nodes in contiguous typed arrays for cache locality. Major rewrite.
- **Lazy augmented attributes**: Only recompute maxEnd/maxLength when queried, not on every modification. Could defer updates until search.
- **Interval deduplication at chop time**: The chop creates new Interval objects. Could reuse the original interval's data reference.
