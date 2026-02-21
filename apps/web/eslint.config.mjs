import { defineConfig } from 'eslint/config';
import tsEslintPlugin from '@typescript-eslint/eslint-plugin';
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';

export default defineConfig([
  ...nextCoreWebVitals,
  {
    ignores: [
      'test-*.js',
      'debug-*.js',
      'verify-*.js',
      '**/test-*.js',
      '**/debug-*.js',
      '**/verify-*.js',
      '**/*.test.ts',
      '**/*.test.tsx',
      '**/*.spec.ts',
      '**/*.spec.tsx',
      '**/__tests__/**',
      'internal/testing/**',
    ],
  },
  {
    rules: {
      'react-hooks/exhaustive-deps': 'warn',
      'react/no-unescaped-entities': 'warn',
      'no-unused-vars': 'off',
      'react-hooks/static-components': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/refs': 'off',
      'react-hooks/purity': 'off',
      'react-hooks/preserve-manual-memoization': 'off',
      'react-hooks/use-memo': 'off',
      'react-hooks/rules-of-hooks': 'warn',
      'react-hooks/immutability': 'warn',
      'react/display-name': 'warn',
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    plugins: {
      '@typescript-eslint': tsEslintPlugin,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  {
    files: ['**/*.test.{js,jsx,ts,tsx}', '**/*.spec.{js,jsx,ts,tsx}'],
    languageOptions: {
      globals: {
        describe: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        it: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
      },
    },
  },
]);
