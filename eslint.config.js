import js from '@eslint/js';
import astro from 'eslint-plugin-astro';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'dist/',
      '.astro/',
      'node_modules/',
      'migration/raw/',
      'coverage/',
      'playwright-report/',
      'test-results/',
      '.lighthouseci/',
      'infra/**/.terraform/',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...astro.configs.recommended,
  {
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      // Internal links must go through url() (src/lib/urls.ts) so staging base paths work.
      'no-restricted-syntax': [
        'error',
        {
          selector: 'JSXAttribute[name.name="href"] > Literal[value=/^\\//]',
          message: 'Use url() from src/lib/urls.ts for internal links.',
        },
      ],
    },
  },
  {
    files: ['**/*.astro'],
    rules: { '@typescript-eslint/no-unused-vars': 'off' },
  },
);
