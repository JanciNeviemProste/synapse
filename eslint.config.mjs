// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'aicoder/**',
      'output/**',
      'public/**',
      'coverage/**',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // NestJS DI relies on parameter properties and decorators.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // Existing codebase logs errors as `(error as Error).message` — allow the cast style.
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
);
