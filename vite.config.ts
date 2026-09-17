import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
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
