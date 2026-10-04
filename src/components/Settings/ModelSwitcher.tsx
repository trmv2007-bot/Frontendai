import type { LLMConfig, AgentState } from '../../agent/types'
import { Cpu, Key, Globe, Zap, Database, Download, Upload, Trash2, Shield, Eye, Mic, Brain, RefreshCw, CheckCircle2 } from 'lucide-react'
import { db } from '../../agent/memory/db'
import { useEffect, useState } from 'react'
import { getEmbeddingStatus, onEmbeddingStatus, getEmbedder } from '../../agent/memory/embeddings'
import { PUTER_MODEL_CANDIDATES, type PuterModel } from '../../agent/llm/puterAdapter'

const FALLBACK_PUTER_MODELS = [...PUTER_MODEL_CANDIDATES]

export function ModelSwitcher({ config, updateConfig, state }: { config: LLMConfig, updateConfig: (p: Partial<LLMConfig>) => void, state: AgentState }) {
  const [puterModels, setPuterModels] = useState<string[]>(FALLBACK_PUTER_MODELS)
  const [puterLoading, setPuterLoading] = useState(false)
  const [puterError, setPuterError] = useState('')
  const [embStatus, setEmbStatus] = useState(getEmbeddingStatus())
  const [embProgress, setEmbProgress] = useState('')

  const providers = [
    { id: 'puter', label: 'Puter AI', desc: 'Frontend AI provider • live model catalog • no app API key', icon: Brain, models: puterModels },
    { id: 'mock', label: 'Mock (Demo)', desc: 'Simulated ReAct loop, no API needed', icon: Zap, models: ['mock-v1'] },
    { id: 'webllm', label: 'WebLLM (Local)', desc: 'Runs in WebGPU, 100% offline, private', icon: Cpu, models: ['Llama-3.2-1B-Instruct-q4f32_1-MLC','Llama-3.2-3B-Instruct-q4f16_1-MLC','Phi-3.5-mini-instruct-q4f16_1-MLC','gemma-2-2b-it-q4f16_1-MLC'] },
    { id: 'openai', label: 'OpenAI BYOK', desc: 'Bring your own key, uses fetch directly', icon: Key, models: ['gpt-4o-mini','gpt-4o','gpt-3.5-turbo'] },
    { id: 'groq', label: 'Groq BYOK', desc: 'Fast inference', icon: Zap, models: ['llama-3.1-8b-instant','llama-3.1-70b-versatile'] },
    { id: 'ollama', label: 'Ollama Local', desc: 'http://localhost:11434', icon: Globe, models: ['llama3.2','phi3.5','gemma2'] },
  ]

  const loadPuterModels = async () => {
    setPuterLoading(true)
    setPuterError('')
    try {
      if (!window.puter?.ai?.listModels) throw new Error('Puter.js is not loaded yet')
      const models = await window.puter.ai.listModels()
      const ids = models.map((model: PuterModel) => model.id).filter(Boolean)
      const preferred = FALLBACK_PUTER_MODELS.filter(candidate => ids.includes(candidate) || ids.includes(candidate.replace(/^openai\//, '')))
      const rest = ids.filter(id => !preferred.includes(id)).sort()
      const next = [...preferred, ...rest]
      if (!next.length) throw new Error('Puter returned no models')
      setPuterModels(next)
      if (config.provider === 'puter' && !next.includes(config.model)) updateConfig({ model: next[0] })
    } catch (error) {
      setPuterError(error instanceof Error ? error.message : String(error))
    } finally {
      setPuterLoading(false)
    }
  }

  useEffect(() => {
    const unsub = onEmbeddingStatus((s, d) => { setEmbStatus(s); if (d) setEmbProgress(d) })
    return () => { unsub() }
  }, [])

  useEffect(() => { if (config.provider === 'puter') void loadPuterModels() }, [config.provider])

  const exportBrain = async () => {
    const mems = await db.memories.toArray()
    const notes = await db.notes.toArray()
    const tasks = await db.tasks.toArray()
    const messages = await db.messages.toArray()
    const blob = new Blob([JSON.stringify({ mems, notes, tasks, messages, exported: Date.now() }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `frontendai-brain-${Date.now()}.json`; a.click(); URL.revokeObjectURL(url)
  }

  const clearAll = async () => {
    if (!confirm('Delete all memories, notes, tasks, messages?')) return
    await Promise.all([db.memories.clear(), db.notes.clear(), db.tasks.clear(), db.messages.clear()])
    localStorage.clear(); location.reload()
  }

  const activeProvider = providers.find(p => p.id === config.provider)
  const activeModels = activeProvider?.models || []

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-6">
      <div>
        <h3 className="text-[12px] font-medium uppercase tracking-widest text-zinc-400 flex items-center gap-2"><Cpu className="w-4 h-4" /> AI Model Switcher</h3>
        <p className="text-[11px] text-zinc-600 mt-1 leading-relaxed">Choose the brain FrontendAI uses. Puter models are loaded from its live catalog when available.</p>
        <div className="mt-4 grid gap-2">
          {providers.map(p => { const active = config.provider === p.id; const Icon = p.icon; return (
            <button key={p.id} onClick={() => updateConfig({ provider: p.id as any, model: p.models[0] })} className={`text-left p-3 rounded-xl border transition-all ${active ? 'bg-violet-600/10 border-violet-500/30 ring-1 ring-violet-500/20' : 'bg-[#1a1a26] border-[#2a2a3e] hover:border-[#3a3a4e]'}`}>
              <div className="flex items-start justify-between gap-3"><div className="flex gap-2.5"><div className={`w-8 h-8 rounded-full flex items-center justify-center border ${active ? 'bg-violet-500 text-white border-violet-500' : 'bg-[#232334] border-[#2a2a3e] text-zinc-400'}`}><Icon className="w-4 h-4" /></div><div><div className="text-[13px] font-medium text-zinc-200 flex items-center gap-2">{p.label} {active && <span className="px-1.5 py-0.5 rounded-full bg-violet-500 text-white text-[10px]">active</span>}</div><div className="text-[11px] text-zinc-500 mt-0.5 leading-relaxed">{p.desc}</div></div></div><div className={`w-2 h-2 rounded-full mt-2 ${active ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-700'}`} /></div>
            </button>
          ) })}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between"><label className="text-[12px] font-medium text-zinc-400">Active Model</label>{config.provider === 'puter' && <button onClick={() => void loadPuterModels()} disabled={puterLoading} className="px-2.5 py-1 rounded-full bg-[#1a1a26] border border-[#2a2a3e] text-[10px] text-zinc-400 hover:text-white disabled:opacity-50 flex items-center gap-1.5"><RefreshCw className={`w-3 h-3 ${puterLoading ? 'animate-spin' : ''}`} /> Refresh models</button>}</div>
        <select value={config.model} onChange={e => updateConfig({ model: e.target.value })} className="w-full h-11 px-3 rounded-xl bg-[#1a1a26] border border-[#2a2a3e] text-[13px] focus:outline-none focus:border-violet-500/50">{activeModels.map(m => <option key={m} value={m}>{m}</option>)}</select>
        {config.provider === 'puter' && <div className="flex items-center justify-between text-[10px] text-zinc-600"><span>{puterModels.length} models available</span><span className="flex items-center gap-1">{puterError ? <span className="text-amber-400">Catalog unavailable</span> : <><CheckCircle2 className="w-3 h-3 text-emerald-500" /> Live catalog</>}</span></div>}
        {puterError && config.provider === 'puter' && <div className="text-[10px] text-amber-300/80 bg-amber-500/5 border border-amber-500/10 rounded-lg p-2">{puterError}. Showing known compatible models.</div>}
        {(config.provider === 'openai' || config.provider === 'groq' || config.provider === 'openrouter') && <><label className="text-[12px] font-medium text-zinc-400">API Key (stored in localStorage only)</label><input type="password" value={config.apiKey || ''} onChange={e => updateConfig({ apiKey: e.target.value })} placeholder="sk-..." className="w-full h-10 px-3 rounded-xl bg-[#1a1a26] border border-[#2a2a3e] text-[13px] font-mono focus:outline-none focus:border-violet-500/50" /></>}
        {config.provider === 'ollama' && <><label className="text-[12px] font-medium text-zinc-400">Base URL</label><input value={config.baseUrl || 'http://localhost:11434/v1'} onChange={e => updateConfig({ baseUrl: e.target.value })} className="w-full h-10 px-3 rounded-xl bg-[#1a1a26] border border-[#2a2a3e] text-[13px] font-mono focus:outline-none" /></>}
      </div>

      <div className="p-3 rounded-xl bg-[#1a1a26] border border-[#2a2a3e] space-y-3"><h4 className="text-[12px] font-medium text-zinc-300 flex items-center gap-2"><Brain className="w-4 h-4" /> Local Intelligence • Voice + Vision + Embeddings</h4><div className="space-y-2"><div className="flex items-center justify-between p-2 rounded-xl bg-[#12121a] border border-[#1e1e2e]"><div className="flex items-center gap-2"><Brain className="w-4 h-4 text-violet-400" /><div><div className="text-[12px] text-zinc-200">Real Embeddings (384-dim)</div><div className="text-[10px] text-zinc-500 font-mono">{embStatus} {embProgress && `• ${embProgress}`}</div></div></div><button onClick={async () => { try { await getEmbedder((p)=>setEmbProgress(p)) } catch {} }} disabled={embStatus==='ready' || embStatus==='loading'} className="px-3 py-1 rounded-full bg-violet-600 hover:bg-violet-500 text-white text-[11px] disabled:opacity-50">{embStatus==='ready' ? 'Ready ✓' : embStatus==='loading' ? 'Loading...' : 'Load 22MB'}</button></div><div className="flex items-center justify-between p-2 rounded-xl bg-[#12121a] border border-[#1e1e2e]"><div className="flex items-center gap-2"><Eye className="w-4 h-4 text-emerald-400" /><div><div className="text-[12px] text-zinc-200">Vision (ViT-GPT2)</div><div className="text-[10px] text-zinc-500">Image captioning local</div></div></div><span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[10px]">On demand</span></div><div className="flex items-center justify-between p-2 rounded-xl bg-[#12121a] border border-[#1e1e2e]"><div className="flex items-center gap-2"><Mic className="w-4 h-4 text-amber-400" /><div><div className="text-[12px] text-zinc-200">Voice (Web Speech API)</div><div className="text-[10px] text-zinc-500">STT + TTS, no server</div></div></div><span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[10px]">{typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) ? 'Supported' : 'Need Chrome'}</span></div></div></div>

      <div className="p-3 rounded-xl bg-[#1a1a26] border border-[#2a2a3e] space-y-3"><h4 className="text-[12px] font-medium text-zinc-300 flex items-center gap-2"><Database className="w-4 h-4" /> Brain Persistence</h4><div className="grid grid-cols-2 gap-2"><button onClick={exportBrain} className="h-9 rounded-full bg-[#232334] hover:bg-[#2a2a3e] border border-[#2a2a3e] text-[12px] flex items-center justify-center gap-1.5"><Download className="w-4 h-4" /> Export Brain</button><label className="h-9 rounded-full bg-[#232334] hover:bg-[#2a2a3e] border border-[#2a2a3e] text-[12px] flex items-center justify-center gap-1.5 cursor-pointer"><Upload className="w-4 h-4" /> Import<input type="file" accept=".json" className="hidden" onChange={async e => { const file = e.target.files?.[0]; if (!file) return; const text = await file.text(); try { const data = JSON.parse(text); if (data.mems) await db.memories.bulkPut(data.mems); if (data.notes) await db.notes.bulkPut(data.notes); if (data.tasks) await db.tasks.bulkPut(data.tasks); alert('Imported!'); location.reload() } catch (err:any) { alert('Import failed: '+err.message) } }} /></label></div><div className="flex items-center gap-2 text-[11px] text-zinc-500"><Shield className="w-3.5 h-3.5" /><span>{state.memoryCount} memories • {navigator.storage ? 'persistent storage' : 'storage'} • no cloud</span></div><button onClick={clearAll} className="w-full h-9 rounded-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-300 text-[12px] flex items-center justify-center gap-1.5"><Trash2 className="w-4 h-4" /> Wipe all local data</button></div>

      <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10"><h4 className="text-[11px] font-medium text-emerald-300 uppercase tracking-wide">Privacy Architecture</h4><ul className="mt-2 text-[11px] text-zinc-500 leading-relaxed list-disc pl-4 space-y-1"><li>LLM runs in WebGPU or direct fetch to provider (no middle server)</li><li>Embeddings & vector search in browser (transformers.js)</li><li>IndexedDB encrypted at rest by browser profile</li><li>No telemetry, no cookies, PWA offline capable</li><li>Tool execution sandboxed: DOM read, JS worker, clipboard</li></ul></div>
    </div>
  )
}
