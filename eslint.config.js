// noinspection SpellCheckingInspection

import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'

// noinspection JSUnusedGlobalSymbols
export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        project: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    files: [
      'src/**/*.ts'
    ],
    ignores: [
      'node_modules/*',
      'dist/*',
    ],
    rules: {
      '@typescript-eslint/no-confusing-void-expression': 'off',
    },
  },
)