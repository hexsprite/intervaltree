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
npm test             # Run tests once using Vitest (with --globals --no-watch)
npm run test:watch   # Run tests in watch mode
```

### Linting
```bash
npx eslint .         # Run ESLint (uses @antfu/eslint-config)
```

## Architecture

### Core Data Structures

- **Interval** (`src/Interval.ts`): Represents a single interval with start/end points and optional data. Immutable value object.
- **IntervalTree** (`src/IntervalTree.ts`): Main public API. Mutable tree structure implementing the `IntervalCollection` interface. Uses red-black tree balancing internally.
- **Node** (`src/Node.ts`): Internal node structure for the red-black tree. Handles insertion, deletion, and rebalancing operations. Not exposed in public API.

### Key Implementation Details

- The tree uses red-black tree balancing (via the Node class) to maintain O(log n) operations
- Each Node maintains a `maxEnd` property for efficient interval overlap searches
- The tree verifies its structure in debug mode (controlled by `NODE_ENV !== 'production'`)
- Intervals are immutable - modifications create new Interval instances

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
- **fromTuples**: Static factory method to create tree from array of [start, end] or [start, end, data] tuples
- **toArray/toSorted/toTuples**: Export tree contents in different formats
- **clone**: Create deep copy of tree
- **size**: Get count of intervals in tree

## Key Algorithms

- **searchOverlap**: Uses maxEnd optimization to prune search branches
- **chop**: Removes overlapping intervals and trims partial overlaps, creating new intervals for non-overlapping portions
- **Red-black tree balancing**: Maintains O(log n) operations via Node class
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
