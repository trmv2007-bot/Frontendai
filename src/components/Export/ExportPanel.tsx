import { useState, useEffect } from 'react'
import { Download, Package, Globe, FileArchive, Smartphone, Monitor, Zap, HardDrive, Check, Copy, ExternalLink } from 'lucide-react'

export function ExportPanel() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [singleFileSize, setSingleFileSize] = useState<string | null>(null)

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', () => setIsInstalled(true))
    // Check if already installed (standalone)
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
    }
    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  const installPWA = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setDeferredPrompt(null)
      setIsInstalled(true)
    }
  }

  const downloadSingleFile = async () => {
    // Try to fetch the single file built by tools/build-single.js
    try {
      const res = await fetch('/frontendai-os-single.html')
      if (res.ok) {
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'FrontendAI-OS-Single.html'
        a.click()
        URL.revokeObjectURL(url)
        return
      }
    } catch {}
    // Fallback: generate current page as single file (best effort)
    const html = document.documentElement.outerHTML
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'FrontendAI-OS-Export.html'
    a.click()
    URL.revokeObjectURL(url)
  }

  const copyInstallCommand = (cmd: string) => {
    navigator.clipboard.writeText(cmd)
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
          <Package className="w-4 h-4 text-white" />
        </div>
        <div>
          <h3 className="font-semibold text-[14px]">Package & Export</h3>
          <p className="text-[11px] text-zinc-500">PWA • Extension • Single File</p>
        </div>
      </div>

      {/* PWA */}
      <div className="rounded-xl border border-[#1e1e2e] bg-[#12121a] p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-[13px] font-medium flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-violet-400" /> PWA — Install as App
          </h4>
          {isInstalled && <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] border border-emerald-500/30 flex items-center gap-1"><Check className="w-3 h-3" />Installed</span>}
        </div>
        <p className="text-[11px] text-zinc-400 mb-3 leading-relaxed">
          Install FrontendAI OS as a native app. Works offline, standalone window, file handling, shortcuts. 100% frontend, no store needed.
        </p>
        <div className="space-y-2">
          <button
            onClick={installPWA}
            disabled={!deferredPrompt && !isInstalled}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-white text-black text-[13px] font-medium hover:bg-zinc-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <Download className="w-4 h-4" />
            {isInstalled ? 'Already Installed' : deferredPrompt ? 'Install PWA' : 'Install Available in Browser Menu'}
          </button>
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div className="p-2 rounded-lg bg-[#1a1a26] border border-[#2a2a3e]">
              <div className="text-zinc-500">Offline</div>
              <div className="text-white font-medium">✅ Workbox cache 10MB</div>
            </div>
            <div className="p-2 rounded-lg bg-[#1a1a26] border border-[#2a2a3e]">
              <div className="text-zinc-500">Display</div>
              <div className="text-white font-medium">Standalone • 520px</div>
            </div>
          </div>
          <div className="text-[10px] text-zinc-500 font-mono bg-[#0a0a0f] p-2 rounded-lg border border-[#1e1e2e]">
            manifest: 4 icons (192/512 + maskable) • shortcuts: Chat/V2V/Files • theme: #8b5cf6
          </div>
        </div>
      </div>

      {/* Chrome Extension */}
      <div className="rounded-xl border border-[#1e1e2e] bg-[#12121a] p-4">
        <h4 className="text-[13px] font-medium flex items-center gap-2 mb-3">
          <Globe className="w-4 h-4 text-blue-400" /> Chrome Extension — OS in Any Page
        </h4>
        <p className="text-[11px] text-zinc-400 mb-3 leading-relaxed">
          Inject orb into any website. Toggle with Ctrl+Shift+O, side panel, or orb click. Works offline — dist bundled inside extension.
        </p>
        <div className="space-y-2">
          <div className="p-3 rounded-lg bg-[#1a1a26] border border-[#2a2a3e] space-y-2">
            <div className="text-[11px] font-medium text-white">Build Extension</div>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-[10px] bg-[#0a0a0f] border border-[#2a2a3e] rounded px-2 py-1.5 font-mono">npm run build:ext</code>
              <button onClick={() => copyInstallCommand('npm run build:ext')} className="p-1.5 rounded bg-[#2a2a3e] hover:bg-[#3a3a4e]"><Copy className="w-3 h-3" /></button>
            </div>
            <div className="text-[10px] text-zinc-500">Creates extension/dist/ + frontendai-os-extension.zip</div>
          </div>
          <div className="p-3 rounded-lg bg-[#1a1a26] border border-[#2a2a3e]">
            <div className="text-[11px] font-medium text-white mb-1.5">Install</div>
            <ol className="text-[10px] text-zinc-400 list-decimal list-inside space-y-1 leading-relaxed">
              <li>Open <code className="bg-[#0a0a0f] px-1 rounded">chrome://extensions</code></li>
              <li>Enable Developer mode</li>
              <li>Load unpacked → select <code className="bg-[#0a0a0f] px-1 rounded">extension/</code></li>
              <li>Pin it, visit any page, click orb or Ctrl+Shift+O</li>
              <li>Side panel: click icon → Open Side Panel</li>
            </ol>
          </div>
          <div className="flex gap-2">
            <div className="flex-1 p-2 rounded-lg bg-[#1a1a26] border border-[#2a2a3e] text-[10px]">
              <div className="text-zinc-500">Manifest</div>
              <div className="text-white">MV3 • sidePanel • content_scripts &lt;all_urls&gt;</div>
            </div>
            <div className="flex-1 p-2 rounded-lg bg-[#1a1a26] border border-[#2a2a3e] text-[10px]">
              <div className="text-zinc-500">Permissions</div>
              <div className="text-white">storage, scripting, sidePanel</div>
            </div>
          </div>
        </div>
      </div>

      {/* Single File */}
      <div className="rounded-xl border border-[#1e1e2e] bg-[#12121a] p-4">
        <h4 className="text-[13px] font-medium flex items-center gap-2 mb-3">
          <FileArchive className="w-4 h-4 text-amber-400" /> Single HTML — No Server, Anywhere
        </h4>
        <p className="text-[11px] text-zinc-400 mb-3 leading-relaxed">
          One HTML file, all JS/CSS inlined. Open in any browser, even offline (after models cached). Carry your OS on a USB stick.
        </p>
        <div className="space-y-2">
          <div className="p-3 rounded-lg bg-[#1a1a26] border border-[#2a2a3e] space-y-2">
            <div className="text-[11px] font-medium text-white">Build Single File</div>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-[10px] bg-[#0a0a0f] border border-[#2a2a3e] rounded px-2 py-1.5 font-mono">npm run build:single</code>
              <button onClick={() => copyInstallCommand('npm run build:single')} className="p-1.5 rounded bg-[#2a2a3e] hover:bg-[#3a3a4e]"><Copy className="w-3 h-3" /></button>
            </div>
            <div className="text-[10px] text-zinc-500">Outputs dist/frontendai-os-single.html (~1-2MB)</div>
          </div>
          <button
            onClick={downloadSingleFile}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-amber-500 text-black text-[13px] font-medium hover:bg-amber-400 transition-all"
          >
            <Download className="w-4 h-4" />
            Download Single HTML (Current)
          </button>
          <div className="grid grid-cols-3 gap-2 text-[10px]">
            <div className="p-2 rounded-lg bg-[#1a1a26] border border-[#2a2a3e] text-center">
              <HardDrive className="w-4 h-4 mx-auto mb-1 text-zinc-400" />
              <div className="text-zinc-500">Size</div>
              <div className="text-white">{singleFileSize || '~1.2 MB'}</div>
            </div>
            <div className="p-2 rounded-lg bg-[#1a1a26] border border-[#2a2a3e] text-center">
              <Zap className="w-4 h-4 mx-auto mb-1 text-zinc-400" />
              <div className="text-zinc-500">Offline</div>
              <div className="text-white">Yes*</div>
            </div>
            <div className="p-2 rounded-lg bg-[#1a1a26] border border-[#2a2a3e] text-center">
              <Monitor className="w-4 h-4 mx-auto mb-1 text-zinc-400" />
              <div className="text-zinc-500">Needs</div>
              <div className="text-white">Just browser</div>
            </div>
          </div>
          <div className="text-[10px] text-zinc-500 font-mono bg-[#0a0a0f] p-2 rounded-lg border border-[#1e1e2e]">
            * First load caches models (Transformers, etc) in IDB. After that, fully offline. Single file inlines JS/CSS, not WASM/models (those cached via Workbox).
          </div>
        </div>
      </div>

      {/* All packages */}
      <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4">
        <h4 className="text-[13px] font-medium flex items-center gap-2 mb-2">
          <Package className="w-4 h-4 text-violet-400" /> All Packages — One Command
        </h4>
        <div className="flex items-center gap-2 mb-2">
          <code className="flex-1 text-[11px] bg-[#0a0a0f] border border-[#2a2a3e] rounded px-3 py-2 font-mono">npm run build:all</code>
          <button onClick={() => copyInstallCommand('npm run build:all')} className="p-2 rounded bg-[#1a1a26] border border-[#2a2a3e] hover:bg-[#232334]"><Copy className="w-3.5 h-3.5" /></button>
        </div>
        <p className="text-[10px] text-zinc-500">
          Builds PWA (dist/), single file (frontendai-os-single.html), extension (extension/dist/ + zip). Ready to ship to Vercel, Chrome Web Store, or USB.
        </p>
        <div className="mt-3 flex gap-2">
          <a href="https://developer.chrome.com/docs/extensions/mv3/getstarted/" target="_blank" className="flex items-center gap-1 text-[10px] text-violet-300 hover:text-violet-200">
            <ExternalLink className="w-3 h-3" /> Chrome Web Store docs
          </a>
          <a href="https://web.dev/articles/pwa" target="_blank" className="flex items-center gap-1 text-[10px] text-violet-300 hover:text-violet-200">
            <ExternalLink className="w-3 h-3" /> PWA docs
          </a>
        </div>
      </div>

      <div className="text-[10px] text-zinc-600 font-mono text-center pt-2">
        FrontendAI OS v9 • PWA + Extension + Single File • 100% frontend • No backend ever
      </div>
    </div>
  )
}
