// eslint-disable-next-line no-undef
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'standard'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'standard:recommended',
  ],
}
