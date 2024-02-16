#!/bin/bash
npx tsup src/bench.ts --no-config --format cjs --env.NODE_ENV production

# run with node
node dist/bench.cjs
