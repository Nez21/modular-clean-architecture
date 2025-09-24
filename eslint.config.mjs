import nx from '@nx/eslint-plugin'
import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'
import unicornPlugin from 'eslint-plugin-unicorn'
import * as importPlugin from 'eslint-plugin-import'
import unusedImports from 'eslint-plugin-unused-imports'
import sonarJsPlugin from 'eslint-plugin-sonarjs'

export default tseslint.config(
  ...nx.configs['flat/base'],
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked.map((config) => ({ ...config, files: ['**/*.ts'] })),
  {
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname
      }
    }
  },
  {
    ...importPlugin.flatConfigs.recommended,
    ...importPlugin.flatConfigs.typescript,
    settings: {
      'import/parsers': {
        '@typescript-eslint/parser': ['.ts']
      },
      'import/resolver': {
        node: {
          extensions: ['.ts']
        },
        typescript: {
          alwaysTryTypes: true,
          project: ['**/tsconfig.json']
        }
      }
    },
    rules: {
      'import/namespace': 'off',
      'import/named': 'off',
      'import/no-unresolved': 'off',
      'import/no-named-as-default': 'off',

      'import/order': [
        'error',
        {
          'newlines-between': 'always-and-inside-groups',
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          pathGroups: [
            {
              pattern: '@internal/**',
              group: 'internal',
              position: 'before'
            },
            {
              pattern: '#/**',
              group: 'internal',
              position: 'after'
            }
          ],
          pathGroupsExcludedImportTypes: ['@internal/**'],
          distinctGroup: true,
          alphabetize: {
            order: 'asc'
          }
        }
      ]
    }
  },
  {
    plugins: {
      'unused-imports': unusedImports
    },
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'after-used',
          argsIgnorePattern: '^_'
        }
      ]
    }
  },
  {
    ...unicornPlugin.configs.recommended,
    files: ['**/*.ts'],
    rules: {
      ...unicornPlugin.configs.recommended.rules,
      'unicorn/filename-case': ['error', { cases: { kebabCase: true }, ignore: [/^\d+-.*$/] }],
      'unicorn/prevent-abbreviations': 'off',
      'unicorn/no-static-only-class': 'off',
      'unicorn/prefer-module': 'off',
      'unicorn/prefer-top-level-await': 'off',
      'unicorn/no-thenable': 'off',
      'unicorn/no-array-callback-reference': 'off',
      'unicorn/no-array-method-this-argument': 'off',
      'unicorn/consistent-function-scoping': 'off',
      'unicorn/no-anonymous-default-export': 'off',
      'unicorn/no-empty-file': 'off',
      'unicorn/no-array-reduce': 'off'
    }
  },
  {
    ...sonarJsPlugin.configs.recommended,
    files: ['**/*.ts'],
    rules: {
      ...sonarJsPlugin.configs.recommended.rules,
      'sonarjs/no-useless-intersection': 'off',
      'sonarjs/no-empty-test-file': 'off',
      'sonarjs/unused-import': 'off',
      'sonarjs/function-return-type': 'off',
      'sonarjs/no-nested-functions': 'off'
    }
  },
  {
    ignores: ['**/dist', '**/out-tsc', '**/*.js', '**/*.mjs', 'vitest.workspace.ts']
  },
  {
    files: ['**/*.ts'],
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: true,
          allow: ['^.*/eslint(\\.base)?\\.config\\.[cm]?js$'],
          depConstraints: [
            {
              sourceTag: '*',
              onlyDependOnLibsWithTags: ['*']
            }
          ]
        }
      ],

      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          disallowTypeAnnotations: false
        }
      ],

      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-extraneous-class': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-useless-constructor': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      '@typescript-eslint/no-invalid-void-type': 'off',
      '@typescript-eslint/unbound-method': 'off',
      '@typescript-eslint/no-unused-expressions': 'off'
    }
  }
)
