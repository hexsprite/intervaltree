#!/bin/bash
set -euo pipefail

# Pre-check: fast syntax/type validation
npx tsup src/bench-metric.ts --no-config --format cjs --env.NODE_ENV production --silent 2>&1 | tail -5

# Run benchmark 5 times, collect medians for stability
declare -a build_times search_times

for i in {1..5}; do
  output=$(node dist/bench-metric.cjs 2>/dev/null)
  bt=$(echo "$output" | grep '^BUILD_MS=' | cut -d= -f2)
  st=$(echo "$output" | grep '^SEARCH_MS=' | cut -d= -f2)
  build_times+=("$bt")
  search_times+=("$st")
done

# Compute medians
median() {
  local sorted=($(printf '%s\n' "$@" | sort -n))
  local n=${#sorted[@]}
  echo "${sorted[$((n/2))]}"
}

build_median=$(median "${build_times[@]}")
search_median=$(median "${search_times[@]}")

# Total = build + search (the two hot paths)
total=$(echo "$build_median + $search_median" | bc)

echo "METRIC total_ms=$total"
echo "METRIC build_ms=$build_median"
echo "METRIC search_ms=$search_median"
