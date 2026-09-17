import { useEffect, useState } from 'react'
import { getInstalledPlugins, installPlugin, uninstallPlugin, togglePlugin, BUILTIN_PLUGINS, installCustomPlugin, pluginDb } from '../../agent/plugins/pluginSystem'
import type { PluginManifest } from '../../agent/plugins/pluginSystem'
import { Puzzle, Download, Trash2, Power, Star, Code, Plus, Search } from 'lucide-react'
import { motion } from 'framer-motion'

export function PluginMarketplace() {
  const [installed, setInstalled] = useState<PluginManifest[]>([])
  const [search, setSearch] = useState('')
  const [showCustom, setShowCustom] = useState(false)
  const [customName, setCustomName] = useState('')
  const [customCode, setCustomCode] = useState(`// Custom plugin example
// Export hooks: onPageLoad, onVoiceTranscript, onIdle, onGoal, etc

export async function onPageLoad() {
  console.log('Custom plugin loaded!');
  return { message: 'Hello from custom plugin' };
}

export async function onGoal(goal) {
  if (goal.includes('hello')) {
    return { response: 'Custom plugin says hi!' };
  }
}
`)

  const load = async () => {
    const all = await getInstalledPlugins()
    setInstalled(all)
  }

  useEffect(() => { load() }, [])

  const handleInstall = async (index: number) => {
    await installPlugin(index)
    await load()
  }

  const filteredBuiltin = BUILTIN_PLUGINS.filter((p, i) => {
    if (installed.some(ip => ip.name === p.name)) return false
    if (!search) return true
    return p.name.toLowerCase().includes(search.toLowerCase()) || p.description.toLowerCase().includes(search.toLowerCase())
  })

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-6">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
          <Puzzle className="w-4 h-4 text-white" />
        </div>
        <div>
          <h3 className="text-[13px] font-medium">Plugin Marketplace • Local Skills • No Server</h3>
          <p className="text-[11px] text-zinc-500">Install local skills, all code runs in browser sandbox, stored in IndexedDB</p>
        </div>
      </div>

      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
          <input
            value={search}
            onChange={e=>setSearch(e.target.value)}
            placeholder="Search plugins..."
            className="w-full h-9 pl-10 pr-3 rounded-full bg-[#1a1a26] border border-[#2a2a3e] text-[12px] focus:outline-none"
          />
        </div>
        <button onClick={() => setShowCustom(!showCustom)} className="h-9 px-4 rounded-full bg-white text-black text-[12px] font-medium flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> Custom
        </button>
      </div>

      {showCustom && (
        <div className="p-3 rounded-xl bg-[#1a1a26] border border-[#2a2a3e] space-y-3">
          <h4 className="text-[12px] font-medium text-zinc-300">Create custom plugin</h4>
          <input
            value={customName}
            onChange={e=>setCustomName(e.target.value)}
            placeholder="Plugin name"
            className="w-full h-9 px-3 rounded-xl bg-[#12121a] border border-[#1e1e2e] text-[12px] focus:outline-none"
          />
          <textarea
            value={customCode}
            onChange={e=>setCustomCode(e.target.value)}
            className="w-full min-h-[120px] p-3 rounded-xl bg-[#0a0a0f] border border-[#1e1e2e] text-[11px] font-mono focus:outline-none resize-none"
          />
          <button
            onClick={async () => {
              if (!customName.trim()) return
              await installCustomPlugin({ name: customName, code: customCode })
              setCustomName('')
              setShowCustom(false)
              load()
            }}
            className="w-full h-9 rounded-full bg-violet-600 hover:bg-violet-500 text-white text-[12px] font-medium"
          >
            Install custom plugin
          </button>
        </div>
      )}

      <div>
        <h4 className="text-[11px] font-medium uppercase tracking-widest text-zinc-500 mb-3">Installed • {installed.length}</h4>
        {installed.length === 0 ? (
          <div className="p-6 rounded-xl bg-[#1a1a26] border border-[#2a2a3e] text-center text-[12px] text-zinc-600">No plugins installed yet. Install from marketplace below.</div>
        ) : (
          <div className="grid gap-2">
            {installed.map(p => (
              <div key={p.id} className="p-3 rounded-xl bg-[#1a1a26] border border-[#2a2a3e] flex items-start justify-between gap-3">
                <div className="flex gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-[#232334] border border-[#2a2a3e] flex items-center justify-center text-[18px]">{p.icon}</div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-medium text-zinc-200">{p.name}</span>
                      <span className="px-1.5 py-0.5 rounded-full bg-[#232334] border border-[#2a2a3e] text-[10px] text-zinc-500">v{p.version}</span>
                      <span className={`px-1.5 py-0.5 rounded-full text-[10px] border ${p.enabled ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' : 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20'}`}>{p.enabled ? 'enabled' : 'disabled'}</span>
                    </div>
                    <div className="text-[11px] text-zinc-500 mt-1 leading-relaxed">{p.description}</div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {p.permissions.map(perm => (
                        <span key={perm} className="px-1.5 py-0.5 rounded-full bg-[#12121a] border border-[#1e1e2e] text-[10px] font-mono text-zinc-600">{perm}</span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={async () => { await togglePlugin(p.id, !p.enabled); load() }} className={`w-7 h-7 rounded-full border flex items-center justify-center ${p.enabled ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-[#232334] border-[#2a2a3e] text-zinc-500'}`}>
                    <Power className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={async () => { await uninstallPlugin(p.id); load() }} className="w-7 h-7 rounded-full bg-[#232334] hover:bg-red-500/20 border border-[#2a2a3e] flex items-center justify-center text-zinc-500 hover:text-red-400">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h4 className="text-[11px] font-medium uppercase tracking-widest text-zinc-500 mb-3">Marketplace • {filteredBuiltin.length} available</h4>
        <div className="grid gap-2">
          {filteredBuiltin.map((p, i) => {
            const originalIndex = BUILTIN_PLUGINS.indexOf(p)
            return (
              <motion.div
                key={p.name}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="p-3 rounded-xl bg-[#1a1a26] border border-[#2a2a3e] hover:border-[#3a3a4e] transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 border border-violet-500/20 flex items-center justify-center text-[18px]">{p.icon}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-medium text-zinc-200">{p.name}</span>
                        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[10px]"><Star className="w-3 h-3" />{p.rating}</span>
                        <span className="text-[10px] text-zinc-600 font-mono">{p.downloads} installs</span>
                      </div>
                      <div className="text-[11px] text-zinc-500 mt-1 leading-relaxed">{p.description}</div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] border ${
                          p.category==='page' ? 'bg-blue-500/10 text-blue-300 border-blue-500/20' :
                          p.category==='code' ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' :
                          p.category==='memory' ? 'bg-violet-500/10 text-violet-300 border-violet-500/20' :
                          'bg-[#232334] text-zinc-500 border-[#2a2a3e]'
                        }`}>{p.category}</span>
                        <span className="text-[10px] font-mono text-zinc-600">by {p.author} • v{p.version}</span>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => handleInstall(originalIndex)} className="shrink-0 h-8 px-3 rounded-full bg-white text-black text-[11px] font-medium flex items-center gap-1 hover:bg-zinc-200">
                    <Download className="w-3.5 h-3.5" /> Install
                  </button>
                </div>
                <details className="mt-3">
                  <summary className="text-[11px] text-zinc-500 cursor-pointer flex items-center gap-1"><Code className="w-3 h-3" /> View code</summary>
                  <pre className="mt-2 p-2 rounded-xl bg-[#0a0a0f] border border-[#1e1e2e] text-[10px] font-mono text-zinc-500 overflow-x-auto whitespace-pre-wrap">{p.code.slice(0,500)}</pre>
                </details>
              </motion.div>
            )
          })}
        </div>
      </div>

      <div className="p-3 rounded-xl bg-violet-500/5 border border-violet-500/10">
        <h4 className="text-[11px] font-medium text-violet-300">How plugins work (100% frontend)</h4>
        <ul className="mt-1.5 text-[11px] text-zinc-500 leading-relaxed list-disc pl-4 space-y-0.5">
          <li><b>Storage</b>: IndexedDB `FrontendAI_Plugins`, no server, survives reload</li>
          <li><b>Sandbox</b>: Code runs via `new Function` (real would use Worker + Comlink)</li>
          <li><b>Hooks</b>: `onPageLoad`, `onVoiceTranscript`, `onIdle`, `onGoal`, `onFileChange`, etc</li>
          <li><b>Permissions</b>: Each plugin declares needed tools, user approves</li>
          <li><b>Custom</b>: Write JS that exports hooks, install as custom plugin</li>
        </ul>
      </div>
    </div>
  )
}
