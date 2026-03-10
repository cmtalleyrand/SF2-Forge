import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

function normalizeBasePath(rawBasePath: string | undefined): string {
  if (!rawBasePath || rawBasePath.trim() === '') {
    return '/';
  }

  const trimmed = rawBasePath.trim();
  if (trimmed === '/') {
    return '/';
  }

  const withLeadingSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return withLeadingSlash.endsWith('/') ? withLeadingSlash : `${withLeadingSlash}/`;
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const basePath = normalizeBasePath(env.VITE_BASE_PATH);
  void env; // env is only used for basePath; API key is managed via localStorage

  return {
    base: basePath,
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [
      react(),
      tailwindcss(),
    ],

    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  };
});
