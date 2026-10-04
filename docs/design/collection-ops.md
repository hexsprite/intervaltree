# Shared collection operations

Decision: retain a generic interval library and use free functions in a future
`src/collectionOps.ts`. This resolves the saved derived-members design.

Share a member only when both adapters would execute the same code and a
literal-value test can pin its behavior. Keep explicit delegating members on
each adapter; introduce no base class or new protected public surface.

The shared functions can cover emptiness, bulk add/remove, interval creation,
tuple/JSON conversion, labeled formatting, iteration, equality, hashing, and
range-union plumbing. Each function depends on only the primitives it reads.
Pin the existing serialized SHA-256 values before moving hash code. The array
adapter should format itself as `ArrayIntervalCollection`, not `IntervalTree`.

Storage, pruned queries, clipping selection, chopping, merging, and set-algebra
algorithms remain independent in the tree and array oracle. Sharing these
would remove the independence that the model check is intended to test.

## Answers to the saved design questions

Empty mutation windows are no-ops; inverted or NaN bounds are errors. This
preserves the explicit empty-range decision made for 2.1.0. A future uniform
query-validation change should apply the same rule, with regression tests and
a breaking release notice: current query methods do not consistently enforce
it. This design resolution does not change their existing error behavior.

Set-algebra inputs can widen to `IntervalCollection<T>` in a minor release,
while each adapter retains its concrete return type. Implementations must read
public size, sorted intervals, and overlap queries instead of another
adapter's private storage. `map` already accepts a callback and can retain its
concrete return type; it needs no collection-input widening.

Canonical iteration and result order are now interface guarantees. `toSorted`
stays as a compatibility alias. Hashes and equality retain the existing
insertion-sensitive behavior for identical bounds with different data.

Implementation is separate from this design decision. Test the shared module
against a minimal primitive stub, adopt it in the oracle while the tree still
has its original code, then adopt it in the tree. Model checks for shared
members must be replaced with properties over independently checked
primitives, rather than comparing the same function against itself.
