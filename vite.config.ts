import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/*.png', 'icons.svg'],
      manifest: {
        name: 'FrontendAI OS',
        short_name: 'FrontendAI',
        description: '100% frontend AI assistant OS — private, local, no backend. Chat, voice, vision, code, files, P2P swarm, CRDT sync, multi-agent team, RAG, plugins.',
        theme_color: '#8b5cf6',
        background_color: '#0a0a0f',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        orientation: 'any',
        categories: ['productivity', 'utilities', 'developer'],
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'icons/icon-192-maskable.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: 'icons/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: 'favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any'
          }
        ],
        shortcuts: [
          { name: 'Chat', url: '/?tab=chat', description: 'Talk to AI', icons: [{ src: 'icons/icon-192.png', sizes: '192x192' }] },
          { name: 'Voice Chat', url: '/?tab=v2v', description: 'Voice-to-voice', icons: [{ src: 'icons/icon-192.png', sizes: '192x192' }] },
          { name: 'Files', url: '/?tab=files', description: 'File vault', icons: [{ src: 'icons/icon-192.png', sizes: '192x192' }] }
        ],
        screenshots: [],
        launch_handler: { client_mode: 'navigate-existing' },
        edge_side_panel: { preferred_width: 520 }
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        maximumFileSizeToCacheInBytes: 30 * 1024 * 1024,
        globIgnores: ['**/ort-wasm*.wasm'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'jsdelivr', expiration: { maxEntries: 50, maxAgeSeconds: 60*60*24*30 } }
          },
          {
            urlPattern: /^https:\/\/.*\.huggingface\.co\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'huggingface', expiration: { maxEntries: 100, maxAgeSeconds: 60*60*24*30 } }
          }
        ]
      },
      devOptions: { enabled: true, type: 'module' }
    })
  ],
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: true,
    cors: true,
    headers: {
      'X-Frame-Options': 'ALLOWALL'
    }
  },
  build: {
    rollupOptions: {
      external: ['@mlc-ai/web-llm']
    }
  },
  optimizeDeps: {
    exclude: ['@mlc-ai/web-llm', '@huggingface/transformers']
  },
  assetsInclude: ['**/*.wasm'],
  worker: {
    format: 'es'
  }
})
