import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    include: ['**/modelCheck.test.ts'],
    testTimeout: 180000,
  },
})
