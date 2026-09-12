import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    env: { INTERVALTREE_DEBUG: '1' },
    globals: true,
    include: ['**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.spec.ts', 'src/**/*.test.ts', 'src/ArrayIntervalCollection.ts'],
      thresholds: { lines: 86, functions: 85, branches: 83, statements: 86 },
    },
  },
})
