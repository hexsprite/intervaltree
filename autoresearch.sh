#!/bin/bash
set -euo pipefail

# Pre-check: fast syntax/type validation
npx tsup src/bench-metric.ts --no-config --format cjs --env.NODE_ENV production --silent 2>&1 | tail -5

# Run benchmark 5 times, collect medians for stability
declare -a init_times schedule_times total_times

for i in {1..3}; do
  output=$(node dist/bench-metric.cjs 2>/dev/null)
  it=$(echo "$output" | grep '^INIT_MS=' | cut -d= -f2)
  st=$(echo "$output" | grep '^SCHEDULE_MS=' | cut -d= -f2)
  tt=$(echo "$output" | grep '^TOTAL_MS=' | cut -d= -f2)
  init_times+=("$it")
  schedule_times+=("$st")
  total_times+=("$tt")
done

# Compute medians
median() {
  local sorted=($(printf '%s\n' "$@" | sort -n))
  local n=${#sorted[@]}
  echo "${sorted[$((n/2))]}"
}

init_median=$(median "${init_times[@]}")
schedule_median=$(median "${schedule_times[@]}")
total_median=$(median "${total_times[@]}")

echo "METRIC total_ms=$total_median"
echo "METRIC init_ms=$init_median"
echo "METRIC schedule_ms=$schedule_median"
