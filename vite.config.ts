import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';

const __buildTime__ = new Date().toISOString().slice(0, 10);

export default defineConfig(() => {
  return {
    define: {
      __APP_VERSION__: JSON.stringify(__buildTime__),
    },
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'prompt',
        includeAssets: ['logo_192.png', 'logo_chat.png', 'logo_180.png'],
        manifest: {
          name: 'Tài Chính Cá Nhân',
          short_name: 'TCP',
          description: 'Ứng dụng quản lý tài chính cá nhân với AI Advisor',
          start_url: '/',
          display: 'standalone',
          background_color: '#F2F2F7',
          theme_color: '#1E293B',
          orientation: 'portrait',
          scope: '/',
          lang: 'vi-VN',
          icons: [
            {
              src: '/logo_192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: '/logo_192.png',
              sizes: '512x512',
              type: 'image/png',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,png,svg,ico,json,woff2}'],
          runtimeCaching: [
            {
              urlPattern: /^https?:\/\/.*\/\.netlify\/functions\/.*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'api-cache',
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 60 * 24,
                },
              },
            },
            {
              urlPattern: /^https:\/\/maps\.vietmap\.vn\/maps\/tiles\/(tm|st)\/.*\.png/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'vietmap-tiles',
                expiration: {
                  maxEntries: 1000,
                  maxAgeSeconds: 60 * 60 * 24 * 30,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      proxy: {
        '/.netlify/functions': {
          target: 'http://localhost:8888',
          changeOrigin: true,
        },
      },
    },
  };
});
