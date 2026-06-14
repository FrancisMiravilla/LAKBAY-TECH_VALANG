const expo = require('eslint-config-expo/flat');
const globals = require('globals');

module.exports = [
  ...expo,
  {
    files: ['**/__tests__/**/*.{js,jsx,ts,tsx}', '**/*.test.{js,jsx,ts,tsx}'],
    languageOptions: {
      globals: {
        ...globals.jest,
      },
    },
  },
  {
    ignores: ['.expo/**', 'node_modules/**', 'dist/**', 'babel.config.js', 'metro.config.js', 'src/draft_to_convert/**'],
  }
];
