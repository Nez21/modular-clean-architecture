import baseConfig from '../../../eslint.config.mjs'

export default [
  ...baseConfig,
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
  }
]
