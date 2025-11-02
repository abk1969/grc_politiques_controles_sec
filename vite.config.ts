import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3002,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        // SÉCURITÉ: Clés API retirées du frontend (maintenant côté serveur uniquement)
        // Les appels AI passent maintenant par le backend proxy /api/ai/*
        'process.env.VITE_API_URL': JSON.stringify(env.VITE_API_URL || 'http://localhost:8001')
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
