import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    env: { INTERVALTREE_DEBUG: '1' },
    globals: true,
    include: ['**/modelCheck.test.ts'],
    testTimeout: 180000,
  },
})
