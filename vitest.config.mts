import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: ['libs/building-blocks', 'libs/common', 'modules/*']
  }
})
