import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// PWA registration (vite-plugin-pwa auto handles via virtual module, but also manual fallback)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // vite-plugin-pwa uses /sw.js or /service-worker.js depending on config
      navigator.serviceWorker.register('/service-worker.js').catch(() => {})
    })
  })
}

// Handle PWA install prompt
let deferredPrompt: any = null
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  deferredPrompt = e
  ;(window as any).__PWA_PROMPT__ = e
  console.log('[PWA] Install prompt ready')
})

window.addEventListener('appinstalled', () => {
  console.log('[PWA] Installed')
  deferredPrompt = null
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
