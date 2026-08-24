import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
      manifest: {
        name: "Aone Tailors & Son's — Shop Manager",
        short_name: 'Aone Tailors',
        description: "Order, customer, and payment management for Aone Tailors & Son's",
        theme_color: '#26336B',
        background_color: '#F6F6F4',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // App shell (JS/CSS/images) cached for fast loads. API calls are NEVER cached —
        // money/customer data must always be fresh, offline writes are not supported.
        runtimeCaching: [
          {
            urlPattern: /^\/api\//,
            handler: 'NetworkOnly',
          },
        ],
        navigateFallbackDenylist: [/^\/api\//],
      },
      devOptions: {
        enabled: false, // avoid PWA behavior interfering with `npm run dev`
      },
    }),
  ],
  server: {
    proxy: { '/api': 'http://localhost:5000' },
  },
});