@AGENTS.md
---

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an interval tree library for JavaScript/TypeScript - a mutable, self-balancing data structure for storing and efficiently querying intervals. The library is written in pure TypeScript with no external runtime dependencies.

## Development Commands

### Build
```bash
npm run build         # Build the library using tsup
npm run clean        # Remove dist directory
```

### Testing
```bash
npm test             # Run unit tests once (Vitest)
npm run test:watch   # Watch mode
npm run model-check  # Property-based model check against the array oracle, ~30 s
npm run test:all     # npm test, then npm run model-check
npm run test:compat  # Build, pack, install the tarball, and smoke-test CJS + ESM imports
```

### Typecheck
```bash
npm run typecheck   # tsc --noEmit over src/ and bench/
```

### Linting
```bash
npx eslint .         # Run ESLint (uses @antfu/eslint-config)
```

## Architecture

### Core Data Structures

- **Interval** (`src/Interval.ts`): Represents a single interval with start/end points and optional data. Immutable value object.
- **IntervalTree** (`src/IntervalTree.ts`): Main public API. Mutable tree structure implementing the `IntervalCollection` interface. Uses augmented AVL tree balancing internally.
- **Node** (`src/Node.ts`): Internal node structure for the augmented AVL tree. Handles insertion, deletion, and rebalancing operations. Not exposed in public API.
- **ArrayIntervalCollection** (`src/ArrayIntervalCollection.ts`): Naive O(n) reference implementation of `IntervalCollection`. Exported. Used as the oracle in the model check and as the executable spec for any other implementation.

### Key Implementation Details

- The tree uses augmented AVL tree balancing (via the Node class) to maintain O(log n) operations
- Each Node maintains a `maxEnd` property for efficient interval overlap searches
- Automatic invariant checks after every mutation are off by default (they cost O(n log n) each). Set `INTERVALTREE_DEBUG=1` to enable them; the vitest configs do. `tree.verify()` always runs on demand.
- Intervals are immutable - modifications create new Interval instances
- Among intervals with identical bounds and different `data`, which one `first()`, `last()`, and `mergeOverlaps()` pick is unspecified by contract.

### Testing Approach

- Tests use Vitest with global test functions enabled
- Property-based testing with fast-check for model checking (`src/modelCheck.ts`)
- Test files are colocated with source (`.spec.ts` suffix)

## Build Configuration

- **TypeScript**: Strict mode enabled, targeting ESNext, module resolution set to bundler
- **Build Tool**: tsup for bundling (outputs both ESM and CJS formats with TypeScript declarations)
- **Package Type**: ESM module (`"type": "module"` in package.json)

## Key API Methods

### Core Operations
- **add/addInterval**: Add intervals to tree (duplicates with same start/end/data are ignored)
- **remove/removeAll**: Remove specific intervals from tree
- **searchPoint**: Find all intervals containing a specific point
- **searchOverlap**: Find all intervals overlapping with a range [start, end)
- **searchEnveloped**: Find intervals completely contained within a range

### Advanced Operations
- **chop(start, end)**: Removes a region from all intervals, splitting those that partially overlap
- **mergeOverlaps()**: Combines adjacent/overlapping intervals into single intervals
- **findOneByLengthStartingAt**: Finds first interval with minimum length starting at/after given point
- **removeEnveloped**: Removes only intervals completely contained within specified range

### Utility Methods
- **fromTuples / fromJSON**: Static factories from `[start, end, data?]` tuples, or from the JSON string `toJSON` produced (`null` data is normalized to `undefined`).
- **toArray/toSorted/toTuples**: Export tree contents in different formats
- **clone**: Create deep copy of tree
- **size**: Get count of intervals in tree

## Key Algorithms

- **searchOverlap**: Uses maxEnd optimization to prune search branches
- **chop**: Removes overlapping intervals and trims partial overlaps, creating new intervals for non-overlapping portions
- **AVL tree balancing**: Maintains O(log n) operations via Node class (height-based; rotates when |balance| > 1)
- **Interval containment**: End points are exclusive (e.g., interval [1,5) contains 1-4 but not 5)

<!-- BEGIN BEADS INTEGRATION v:1 profile:minimal hash:ca08a54f -->
## Beads Issue Tracker

This project uses **bd (beads)** for issue tracking. Run `bd prime` to see full workflow context and commands.

### Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --claim  # Claim work
bd close <id>         # Complete work
```

### Rules

- Use `bd` for ALL task tracking — do NOT use TodoWrite, TaskCreate, or markdown TODO lists
- Run `bd prime` for detailed command reference and session close protocol
- Use `bd remember` for persistent knowledge — do NOT use MEMORY.md files

## Session Completion

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   bd dolt push
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds
<!-- END BEADS INTEGRATION -->
