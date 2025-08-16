import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { globalIgnores } from 'eslint/config'

export default tseslint.config([
  globalIgnores(['dist', 'out', 'extension/out']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { 
        args: 'none',
        varsIgnorePattern: '^_',
        argsIgnorePattern: '^_',
        ignoreRestSiblings: true
      }],
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-prototype-builtins': 'warn',
      'react-hooks/exhaustive-deps': 'warn',
      '@typescript-eslint/no-namespace': ['error', { 
        allowDeclarations: true,
        allowDefinitionFiles: true
      }],
    },
  },
  {
    files: ['**/*.test.{ts,tsx}', '**/test/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
])
