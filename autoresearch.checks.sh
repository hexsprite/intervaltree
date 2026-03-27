#!/bin/bash
set -euo pipefail
# Run tests - suppress verbose output, show only failures
npx vitest --no-watch --reporter=dot 2>&1 | tail -20
