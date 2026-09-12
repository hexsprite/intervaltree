import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  // @noble/hashes is bundled into dist, so it lives in devDependencies. Keep these two in sync.
  noExternal: ['@noble/hashes'],
})
