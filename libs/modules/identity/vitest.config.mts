import { join } from 'node:path'

import swc from 'unplugin-swc'
import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'

export default defineConfig(() => ({
  root: __dirname,
  cacheDir: '../../../node_modules/.vite/libs/modules/identity',
  plugins: [
    swc.vite({
      module: { type: 'es6' }
    }),
    tsconfigPaths({ projects: [join(__dirname, 'tsconfig.spec.json')] })
  ],
  test: {
    watch: false,
    globals: true,
    environment: 'node',
    include: ['{src,tests}/**/*.{test,spec}.ts'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: './test-output/vitest/coverage',
      provider: 'v8' as const
    },
    passWithNoTests: true,
    setupFiles: ['./tests/setup-file.ts']
  }
}))
