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
harness="$(mktemp -d "$PWD/node_modules/.intervaltree-compat.XXXXXX")"
cleanup() {
  if [[ -e "$harness/original" || -L "$harness/original" ]]; then
    rm -rf node_modules/intervaltree
    mv -f "$harness/original" node_modules/intervaltree
  fi
  rm -rf "$harness"
}
trap cleanup EXIT

# Installing in isolation leaves the consumer's locked dependency tree intact.
npm install --prefix "$harness" --no-save --ignore-scripts --no-audit --no-fund "$candidate"
node -e 'const p=require(process.argv[1]); if(Object.keys(p.dependencies || {}).length) throw new Error("The isolated override requires a self-contained intervaltree distribution")' "$harness/node_modules/intervaltree/package.json"
mv -f node_modules/intervaltree "$harness/original"
cp -rf "$harness/node_modules/intervaltree" node_modules/intervaltree
node -p "'Testing packed intervaltree ' + require('intervaltree/package.json').version"
npm run test-unit -- imports/schedule/domain/freelist
