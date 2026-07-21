// Canonical NestJS ESLint setup (the devDeps were always here; the config file
// was missing, which made `npm run lint` a hard error). Formatting is NOT
// lint-gated — run `npm run format` (prettier) for that; `prettier` in extends
// only disables stylistic rules that would fight it.
module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: 'tsconfig.json',
    tsconfigRootDir: __dirname,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint/eslint-plugin'],
  extends: ['plugin:@typescript-eslint/recommended', 'prettier'],
  root: true,
  env: {
    node: true,
    jest: true,
  },
  ignorePatterns: ['.eslintrc.js', 'dist', 'node_modules'],
  rules: {
    '@typescript-eslint/interface-name-prefix': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    // CommonJS-only deps (ip-range-check, etc.) need require() interop —
    // tsconfig has no esModuleInterop. See backend/CLAUDE.md "Common pitfalls".
    '@typescript-eslint/no-var-requires': 'off',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
  },
};
