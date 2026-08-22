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
        navigateFallback: BASE + 'index.html',
        runtimeCaching: [
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
