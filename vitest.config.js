import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      exclude: ['node_modules/', 'src/tests/', '*.config.js'],
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
    env: {
      BINDER_API_URL: 'http://localhost:4100',
      BINDER_INTERNAL_SECRET: 'test-binder-secret',
      LOG_LEVEL: 'error',
      NODE_ENV: 'test',
      PORT: '8080',
      PORTAL_INTERNAL_SECRET: 'test-portal-secret',
    },
    environment: 'node',
    globals: true,
  },
});
