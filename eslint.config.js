// eslint.config.js
import js from '@eslint/js';

export default [
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',

      // 👇 THIS FIXES process, console, etc.
      globals: {
        console: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
      },
    },

    rules: {
      /* ===== BASIC STYLE RULES ===== */
      quotes: ['error', 'single', { avoidEscape: true }],
      semi: ['error', 'always'],
      'comma-dangle': ['error', 'always-multiline'],

      /* ===== NODE BACKEND FRIENDLY ===== */
      'no-console': 'off',

      /* ===== UNUSED VARS (SOFTENED) ===== */
      'no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',     // allow (_req, _res)
          varsIgnorePattern: '^_',     // allow _temp
          caughtErrorsIgnorePattern: '^error$', // allow catch(error)
        },
      ],

      'no-underscore-dangle': 'off',
      'consistent-return': 'off',
    },
  },
];
