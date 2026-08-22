import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// base debe calzar exactamente con la ruta de GitHub Pages (/nutri/),
// si no el service worker no registra y la app no se instala.
const BASE = '/nutri/'

const SELLO = new Date().toISOString().slice(0, 16).replace('T', ' ')

export default defineConfig({
  define: { __SELLO__: JSON.stringify(SELLO) },
  base: BASE,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // El registro se hace a mano en main.jsx: el script que inyecta el plugin
      // solo registra el service worker y NO recarga la pagina cuando llega una
      // version nueva, asi que habia que abrir la app dos veces para verla.
      injectRegister: null,
      includeAssets: ['icons/apple-touch-icon.png', 'icons/favicon.svg'],
      manifest: {
        name: 'Nutri',
        short_name: 'Nutri',
        description: 'Registro de comidas, calorias y macros',
        start_url: BASE,
        scope: BASE,
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0d1117',
        theme_color: '#0d1117',
        lang: 'es-CL',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,json,woff2}'],
        // El catalogo de supermercado son varios MB: no tiene sentido bajarlo
        // en la instalacion. Se baja la primera vez que Isi busca algo y desde
        // ahi queda cacheado. La tabla chilena, que es la importante, si va
        // precacheada.
        globIgnores: ['**/off-cl.json'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        navigateFallback: BASE + 'index.html',
        runtimeCaching: [
          {
            urlPattern: /\/off-cl\.json$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'catalogo-supermercado',
              expiration: { maxEntries: 2, maxAgeSeconds: 60 * 60 * 24 * 90 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // las fotos de producto: una vez vistas, quedan
            urlPattern: /^https:\/\/images\.openfoodfacts\.org\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'fotos-productos',
              expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/world\.openfoodfacts\.org\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'openfoodfacts',
              networkTimeoutSeconds: 6,
              expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 7 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
})
