import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  define: {
    'import.meta.env.MODE': JSON.stringify('test'),
  },
  resolve: {
    alias: {
      'cloudflare:workers': fileURLToPath(
        new URL('./test/__mocks__/cloudflare-workers.ts', import.meta.url),
      ),
      'astro:env/client': fileURLToPath(
        new URL('./test/__mocks__/astro-env-client.ts', import.meta.url),
      ),
      'astro:middleware': fileURLToPath(
        new URL('./test/__mocks__/astro-middleware.ts', import.meta.url),
      ),
    },
    tsconfigPaths: true,
  },
  test: {
    coverage: {
      exclude: [
        '**/*.d.ts',
        '**/*.test.ts',
        '**/node_modules/**',
        '**/dist/**',
        '**/__mocks__/**',
        '**/public/**',
        '**/*.css',
        '**/*.astro',
        '**/coverage/**',
        '**/.wrangler/**',
        '**/e2e/**',
        '**/playwright.config.ts',
        '**/vitest.config.ts',
        '**/vitest.setup.ts',
        '**/astro.config.mjs',
      ],
      include: ['src/**/*.ts'],
      provider: 'v8',
      reporter: ['text', 'text-summary'],
      thresholds: {
        branches: 100,
        functions: 100,
        lines: 100,
        statements: 100,
      },
    },
    deps: {
      interopDefault: true,
    },
    environment: 'happy-dom',
    globals: true,
    include: ['test/**/*.test.ts'],
    setupFiles: ['./vitest.setup.ts'],
  },
});
