import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    coverage: {
      exclude: [
        '**/+types/**',
        '**/*.d.ts',
        '**/*.test.{ts,tsx}',
        '**/node_modules/**',
        '**/build/**',
        '**/dist/**',
        '**/__mocks__/**',
        '**/public/**',
        '**/*.css',
        '**/*.svg',
        '**/workers/**',
        '**/test-setup.ts',
        '**/locales/**',
        '**/zod.ts',
        '**/coverage/**',
        '**/.next/**',
        '**/.open-next/**',
        '**/next.config.ts',
        '**/open-next.config.ts',
        '**/shared/cloudflare/image.ts',
        '**/src/i18n/**',
        '**/src/app/**',
      ],
      include: ['**/*.{ts,tsx,js,jsx}'],
      provider: 'v8',
      reporter: ['text', 'text-summary', 'html'],
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
    include: [
      'app/**/*.test.{ts,tsx}',
      'com/**/*.test.{ts,tsx}',
      'dev/**/*.test.{ts,tsx}',
      'org/**/*.test.{ts,tsx}',
      'net/**/*.test.{ts,tsx}',
      'shared/**/*.test.{ts,tsx}',
      'test/**/*.test.{ts,tsx}',
    ],
    setupFiles: ['./vitest.setup.ts'],
  },
});
