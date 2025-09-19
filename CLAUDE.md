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
- **searchEnvelop**: Find intervals completely contained within a range

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