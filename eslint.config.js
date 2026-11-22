import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default tseslint.config(
  {ignores: ['dist', 'dist-online', 'dev-dist', '.build', '.wrangler', '.claude', '.playwright-cli', 'android', 'node_modules', 'output', 'models-src', 'public', 'scripts/.cache', '**/*.browser.js']},
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      'no-empty': ['error', {allowEmptyCatch: true}],
      '@typescript-eslint/no-unused-vars': ['error', {argsIgnorePattern: '^_', varsIgnorePattern: '^_', destructuredArrayIgnorePattern: '^_'}],
    },
  },
  {
    files: ['src/**/*.{ts,tsx}', 'functions/**/*.ts'],
    languageOptions: {globals: globals.browser},
    plugins: {'react-hooks': reactHooks},
    rules: {
      ...reactHooks.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-restricted-syntax': ['error', {
        selector: "MemberExpression[object.name='WebAssembly']",
        message: 'The site CSP does not allow WebAssembly compilation.',
      }],
    },
  },
  {
    files: ['scripts/**/*.{ts,mjs,js}', 'eslint.config.js', 'vite.config.ts', 'capacitor.config.ts'],
    languageOptions: {globals: globals.node},
    rules: {'@typescript-eslint/no-explicit-any': 'off'},
  },
);
