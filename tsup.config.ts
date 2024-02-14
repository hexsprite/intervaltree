import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: 'esm',
  dts: true,
  replaceNodeEnv: true,
  env: {
    INTERVAL_TREE_DEBUG: '',
  },
})
