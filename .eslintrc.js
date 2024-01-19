// eslint-disable-next-line no-undef
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended-type-checked',
  ],
  rules: {
    '@typescript-eslint/member-ordering': 'error',
    '@typescript-eslint/restrict-template-expressions': 0,
  },
  parserOptions: {
    project: 'tsconfig.json',
  },
}
