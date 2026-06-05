import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(), 
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        workbox: {
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MiB
        },
        manifest: {
          name: 'RIL-HMD Fire Protection System',
          short_name: 'RIL-HMD',
          description: 'RIL HMD Fire Protection System Management',
          theme_color: '#C09532',
          background_color: '#FFFFFF',
          display: 'standalone',
          icons: [
            {
              src: 'https://upload.wikimedia.org/wikipedia/en/thumb/9/99/Reliance_Industries_Logo.svg/192px-Reliance_Industries_Logo.svg.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'https://upload.wikimedia.org/wikipedia/en/thumb/9/99/Reliance_Industries_Logo.svg/512px-Reliance_Industries_Logo.svg.png',
              sizes: '512x512',
              type: 'image/png'
            }
          ]
        }
      })
    ],
    build: {
      outDir: 'dist',
      emptyOutDir: true,
    },
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || ""),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
