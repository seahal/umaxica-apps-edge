import { defineConfig } from 'vite-plus';

export default defineConfig({
  run: {
    cache: {
      scripts: true,
      tasks: true,
    },
  },
  staged: {
    '*': 'vp test && vp check',
  },
  fmt: {
    printWidth: 100,
    tabWidth: 2,
    useTabs: false,
    semi: true,
    singleQuote: true,
    trailingComma: 'all',
    insertFinalNewline: true,
    sortPackageJson: true,
    overrides: [
      {
        files: ['**/*.json', '**/*.jsonc'],
        options: {
          trailingComma: 'none',
        },
      },
      {
        files: ['**/*.yaml', '**/*.yml'],
        options: {
          printWidth: 100,
        },
      },
      {
        files: ['**/*.md', '**/*.mdx'],
        options: {
          printWidth: 80,
        },
      },
    ],
    ignorePatterns: [
      '**/.wrangler/**',
      '**/dist/**',
      '**/node_modules/**',
      '**/build/**',
      '**/+types/**',
      'pnpm-lock.yaml',
    ],
  },
  lint: {
    plugins: [
      'eslint',
      'typescript',
      'unicorn',
      'oxc',
      'react',
      'import',
      'jsx-a11y',
      'promise',
      'react-perf',
      'vitest',
    ],
    env: {
      browser: true,
      es2024: true,
    },
    globals: {},
    settings: {
      react: {
        version: '19',
      },
      vitest: {
        typecheck: true,
      },
    },
    rules: {
      'no-unused-vars': 'error',
      'no-console': 'error',
      'no-var': 'error',
      'prefer-const': 'error',
      eqeqeq: 'error',
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-debugger': 'error',
      'no-alert': 'error',
      'no-empty': 'error',
      'react/react-in-jsx-scope': 'off',
      'react/no-danger': 'error',
      'typescript/no-explicit-any': 'error',
      'typescript/no-non-null-assertion': 'error',
      'typescript/consistent-type-imports': 'error',
      'typescript/no-misused-promises': 'error',
      'import/no-cycle': 'error',
      'import/no-unassigned-import': 'off',
      'promise/catch-or-return': 'error',
      'react-perf/jsx-no-new-function-as-prop': 'warn',
      'react-perf/jsx-no-new-object-as-prop': 'warn',
      'vitest/no-conditional-tests': 'error',
      'vitest/warn-todo': 'warn',
    },
    overrides: [
      {
        files: ['**/*.test.*', '**/*.spec.*', '**/test/**'],
        rules: {
          'no-console': 'off',
        },
      },
    ],
    ignorePatterns: [
      '**/.wrangler/**',
      '**/dist/**',
      '**/node_modules/**',
      'worker-configuration.d.ts',
      '**/+types/**',
      '**/build/**',
      'app/news/**',
      'app/docs/**',
      'app/help/**',
      'com/news/**',
      'com/docs/**',
      'com/help/**',
      'org/news/**',
      'org/docs/**',
      'org/help/**',
      'dev/core/**',
    ],
    options: {
      reportUnusedDisableDirectives: 'warn',
      typeAware: true,
      typeCheck: true,
    },
  },
});
