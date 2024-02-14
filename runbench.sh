#!/bin/bash
# build with esbuild
# bunx esbuild --bundle --sourcemap --outfile=dist/bench.js --platform=node --define:process.env.NODE_ENV=\"production\" src/bench.ts
bun build --sourcemap --outfile=dist/bench.js --target=node --define process.env.NODE_ENV=\"production\" src/bench.ts

# run with node
bun dist/bench.js

