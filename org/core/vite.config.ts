import { cloudflare } from '@cloudflare/vite-plugin';
import react from '@vitejs/plugin-react';
import { reactRouter } from '@react-router/dev/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite-plus';
import tsconfigPaths from 'vite-tsconfig-paths';

const ReactCompilerConfig = {
  target: '19',
};

export default defineConfig(({ command }) => {
  const configuredPort = Number.parseInt(process.env.PORT ?? '5302', 10);
  const serverPort = Number.isNaN(configuredPort) ? 5302 : configuredPort;

  return {
    oxc: {
      jsx: {
        runtime: 'automatic',
        development: command !== 'build',
      },
    },
    plugins: [
      tailwindcss(),
      cloudflare({
        inspectorPort: false,
        viteEnvironment: { name: 'ssr' },
      }),
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
      port: serverPort,
      strictPort: false,
      watch: {
        usePolling: true,
      },
    },
  };
});
