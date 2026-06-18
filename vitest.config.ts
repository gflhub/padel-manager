import { defineConfig } from 'vitest/config'
import { loadEnv } from 'vite'
import path from 'path'

export default defineConfig(({ mode }) => ({
  test: {
    environment: 'node',
    globals: true,
    testTimeout: 10000,
    hookTimeout: 10000,
    env: loadEnv(mode, process.cwd(), ''),
    exclude: ['**/node_modules/**', '**/e2e/**'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
}))
