import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      manifestFilename: 'manifest.webmanifest',
      includeAssets: ['icons/icon-192.png', 'icons/icon-512.png', 'assets/override/manifest.json'],
      manifest: {
        name: 'Pixel Hero',
        short_name: 'Pixel Hero',
        description: 'Classic 16-bit 2D platformer starring Pip',
        start_url: '/',
        display: 'fullscreen',
        orientation: 'landscape',
        background_color: '#000000',
        theme_color: '#100e22',
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,json,webmanifest}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            urlPattern: /^\/api\/.*/i,
            handler: 'NetworkOnly',
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@pixel-hero/shared': path.resolve(__dirname, '../shared/src/index.ts'),
    },
  },
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
