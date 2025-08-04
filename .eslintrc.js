module.exports = {
  root: true,
  env: {
    es2022: true,
    node: true,
    jest: true,
  },
  extends: ['eslint:recommended', 'prettier'],
  plugins: ['prettier'],
  rules: {
    'prettier/prettier': 'error',
  },
  overrides: [
    {
      // Backend TypeScript files
      files: ['apps/backend/**/*.ts'],
      env: {
        node: true,
        es2022: true,
        jest: true,
      },
      parser: '@typescript-eslint/parser',
      plugins: ['@typescript-eslint'],
      rules: {
        '@typescript-eslint/no-unused-vars': [
          'error',
          { argsIgnorePattern: '^_' },
        ],
        '@typescript-eslint/no-explicit-any': 'error',
      },
    },
    {
      // Frontend TypeScript files
      files: ['apps/frontend/**/*.{ts,tsx}'],
      env: {
        browser: true,
        es2022: true,
      },
      parser: '@typescript-eslint/parser',
      plugins: ['@typescript-eslint'],
      rules: {
        '@typescript-eslint/no-unused-vars': [
          'error',
          { argsIgnorePattern: '^_' },
        ],
        '@typescript-eslint/no-explicit-any': 'error',
      },
    },
    {
      // E2E tests - more permissive rules for test setup/teardown
      files: ['packages/e2e-tests/**/*.ts'],
      env: {
        node: true,
        es2022: true,
        jest: true,
      },
      parser: '@typescript-eslint/parser',
      plugins: ['@typescript-eslint'],
      rules: {
        '@typescript-eslint/no-unused-vars': 'off',
        '@typescript-eslint/no-explicit-any': 'error',
        'no-unused-vars': 'off',
      },
    },
    {
      // Other TypeScript files
      files: ['*.ts'],
      env: {
        node: true,
        es2022: true,
        jest: true,
      },
      parser: '@typescript-eslint/parser',
      plugins: ['@typescript-eslint'],
      rules: {
        '@typescript-eslint/no-unused-vars': [
          'error',
          { argsIgnorePattern: '^_' },
        ],
        '@typescript-eslint/no-explicit-any': 'error',
      },
    },
  ],
  ignorePatterns: ['dist/', 'node_modules/', '*.js'],
};
