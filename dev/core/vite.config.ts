import react from '@vitejs/plugin-react';
import { reactRouter } from '@react-router/dev/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite-plus';
import tsconfigPaths from 'vite-tsconfig-paths';

const ReactCompilerConfig = {
  target: '19',
};

export default defineConfig(({ command }) => ({
  oxc: {
    jsx: {
      runtime: 'automatic',
      development: command !== 'build',
    },
  },
  plugins: [
    tailwindcss(),
    reactRouter(),
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler', ReactCompilerConfig]],
        presets: ['@babel/preset-typescript'],
      },
      include: /\.[jt]sx?$/,
    }),
    tsconfigPaths(),
  ],
  server: {
    host: true,
    port: 5502,
    strictPort: true,
    watch: {
      usePolling: true,
    },
  },
}));
