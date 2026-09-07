import antfu from '@antfu/eslint-config'

export default antfu({
  typescript: true,
  ignores: ['dist/**', 'node_modules/**', '*.md', '*.json', '.github/**', '.beads/**', '.claude/**', '.agents/**', '.gc/**'],
}, {
  // antfu's default enforces trustPolicy: no-downgrade, which rejects the
  // current lockfile. Only require the setting this file exists for.
  files: ['pnpm-workspace.yaml'],
  rules: {
    'pnpm/yaml-enforce-settings': ['error', { settings: { allowBuilds: { esbuild: true } } }],
  },
})
