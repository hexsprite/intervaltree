#!/usr/bin/env bash
set -euo pipefail

if [[ $# != 2 ]]; then
  echo 'Usage: check-focuster-compat.sh <focuster-checkout> <absolute-candidate.tgz>' >&2
  exit 2
fi

consumer="$1"
candidate="$2"
[[ -f "$candidate" ]] || { echo "Candidate not found: $candidate" >&2; exit 2; }
cd "$consumer"
npm install --no-save --package-lock=false --ignore-scripts --no-audit --no-fund "$candidate"
node -p "'Testing packed intervaltree ' + require('intervaltree/package.json').version"
npm run test-unit -- imports/schedule/domain/freelist
