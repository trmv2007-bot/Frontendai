import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { installBrowserContextProvider } from './agent/environment/browserProvider'

// Install the semantic browser environment before React mounts so the agent
// has a live environment from the first render.
installBrowserContextProvider()

// PWA registration (vite-plugin-pwa auto handles via virtual module, but also manual fallback)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      navigator.serviceWorker.register('/service-worker.js').catch(() => {})
    })
  })
}

let deferredPrompt: any = null
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  deferredPrompt = e
  ;(window as any).__PWA_PROMPT__ = e
})

window.addEventListener('appinstalled', () => {
  deferredPrompt = null
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
