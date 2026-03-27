#!/bin/bash
set -euo pipefail

# Run the full test suite — suppress verbose output, show only failures
npx vitest --no-watch --reporter=dot 2>&1 | tail -20

# Run the model-check tests (property-based)
npx vitest run --config vitest.model.config.ts --reporter=dot 2>&1 | tail -20
