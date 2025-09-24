import { rules } from 'eslint-plugin-import'
import baseConfig from '../../eslint.config.mjs'

export default [
  ...baseConfig,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-unsafe-function-type': 'off',
      '@typescript-eslint/no-unnecessary-type-parameters': 'off'
    }
  },
  {
    files: ['**/*.json'],
    rules: {
      '@nx/dependency-checks': [
        'error',
        {
          ignoredFiles: ['{projectRoot}/eslint.config.{js,cjs,mjs}', '{projectRoot}/vitest.config.mts'],
          ignoredDependencies: ['vitest', 'reflect-metadata', 'typescript']
        }
      ]
    },
    languageOptions: {
      parser: await import('jsonc-eslint-parser')
    }
  },
  {
    files: ['**/*.spec.ts'],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      'unicorn/no-null': 'off'
    }
  }
]
