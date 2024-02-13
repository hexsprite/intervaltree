import { defineConfig } from 'tsup'

export default defineConfig({
  // Outputs `dist/a.js` and `dist/b.js`.
  entry: ['src/index.ts'],
  dts: true,
  env: {
    INTERVAL_TREE_DEBUG: '1',
  },
})
