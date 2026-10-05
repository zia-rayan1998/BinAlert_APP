import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Dev server config.
 *
 * All upstream URLs come from `binalert/.env` — nothing production is
 * hard-coded. When `VITE_API_URL` points at the local Express API, `/api`
 * requests are proxied there so the browser never needs CORS in development.
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiTarget = env.VITE_API_URL ?? 'http://localhost:4000';
  const port = Number(env.VITE_PORT ?? 5173);

  return {
    plugins: [react()],
    server: {
      port,
      host: true,
      strictPort: false,
      proxy: {
        '/api': { target: apiTarget, changeOrigin: true, secure: false },
      },
    },
    build: { chunkSizeWarningLimit: 1200 },
  };
});
