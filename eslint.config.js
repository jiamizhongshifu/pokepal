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
    // Rules are settled here, not silenced line by line. A value an effect should read without re-running goes
    // through useEvent (src/lib/hooks.ts); a value fixed on arrival goes in useState's initializer.
    linterOptions: {noInlineConfig: true},
    languageOptions: {globals: globals.browser},
    plugins: {'react-hooks': reactHooks},
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-hooks/exhaustive-deps': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      'no-restricted-syntax': ['error', {
        selector: "MemberExpression[object.name='WebAssembly']",
        message: 'The site CSP does not allow WebAssembly compilation.',
      }],
    },
  },
  {
    // gtag only accepts the Arguments object, not an array copy.
    files: ['src/lib/analytics.ts'],
    rules: {'prefer-rest-params': 'off'},
  },
  {
    files: ['scripts/**/*.{ts,mjs,js}', 'eslint.config.js', 'vite.config.ts', 'capacitor.config.ts'],
    languageOptions: {globals: globals.node},
    rules: {'@typescript-eslint/no-explicit-any': 'off'},
  },
);
