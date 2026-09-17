import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAgent } from './hooks/useAgent'
import { useCompanion } from './hooks/useCompanion'
import { AgentOrb } from './components/AgentOrb'
import { AgentDock } from './components/AgentDock'
import { CommandPalette } from './components/CommandPalette'
import { startAutoSummarizer } from './agent/memory/summarizer'
import { getCRDT } from './agent/sync/crdtSync'
import { getSwarm } from './agent/p2p/swarm'
import { Sparkles, Cpu, Globe, Brain, Shield, Zap, Eye, Code, Database, MessageSquare, Moon, Coffee } from 'lucide-react'

function Landing({ onOpen, companionMood, companionActions }: { onOpen: () => void, companionMood: string, companionActions: any[] }) {
  const [mouse, setMouse] = useState({ x: 0, y: 0 })
  useEffect(() => {
    const h = (e: MouseEvent) => setMouse({ x: e.clientX, y: e.clientY })
    window.addEventListener('mousemove', h)
    return () => window.removeEventListener('mousemove', h)
  }, [])

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#050508] text-white selection:bg-violet-500/30">
      {/* bg */}
      <div className="absolute inset-0 bg-grid opacity-[0.03]" />
      <div className="absolute inset-0 opacity-40" style={{
        background: `radial-gradient(800px circle at ${mouse.x}px ${mouse.y}px, rgba(139,92,246,0.15), transparent 40%), radial-gradient(600px circle at 80% 20%, rgba(6,255,165,0.1), transparent 50%), radial-gradient(600px circle at 20% 80%, rgba(139,92,246,0.1), transparent 50%)`
      }} />

      {/* nav */}
      <nav className="relative z-10 flex items-center justify-between px-6 md:px-10 h-[64px] border-b border-white/[0.06] backdrop-blur-xl bg-black/20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center shadow-[0_0_20px_rgba(139,92,246,0.5)]">
            <Cpu className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold tracking-tight">FrontendAI</span>
          <span className="px-2 py-0.5 rounded-full bg-white/10 border border-white/10 text-[10px] font-mono uppercase tracking-widest">OS v4</span>
          <span className={`px-2 py-0.5 rounded-full border text-[10px] font-mono flex items-center gap-1 ${
            companionMood === 'sleepy' ? 'bg-zinc-500/10 border-zinc-500/20 text-zinc-400' :
            companionMood === 'bored' ? 'bg-amber-500/10 border-amber-500/20 text-amber-300' :
            companionMood === 'curious' ? 'bg-violet-500/10 border-violet-500/20 text-violet-300' :
            companionMood === 'focused' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' :
            'bg-white/5 border-white/10 text-zinc-500'
          }`}>
            {companionMood === 'sleepy' && <Moon className="w-3 h-3" />}
            {companionMood === 'bored' && <Coffee className="w-3 h-3" />}
            {companionMood === 'curious' && <Eye className="w-3 h-3" />}
            {companionMood === 'focused' && <Zap className="w-3 h-3" />}
            {companionMood}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />100% frontend • no backend
          </span>
          <button onClick={onOpen} className="px-4 py-2 rounded-full bg-white text-black text-[13px] font-medium hover:bg-zinc-200 transition-colors">Open Agent</button>
        </div>
      </nav>

      {/* companion toast */}
      <AnimatePresence>
        {companionActions.slice(0,1).map(a => (
          <motion.div
            key={a.id}
            initial={{ opacity: 0, y: -20, x: 20 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 right-6 z-20 max-w-[320px] p-3 rounded-2xl bg-[#1a1a26]/90 backdrop-blur-xl border border-[#2a2a3e] shadow-2xl"
          >
            <div className="flex gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                a.mood === 'bored' ? 'bg-amber-500/20 text-amber-400' :
                a.mood === 'sleepy' ? 'bg-zinc-500/20 text-zinc-400' :
                a.mood === 'curious' ? 'bg-violet-500/20 text-violet-400' :
                'bg-emerald-500/20 text-emerald-400'
              }`}>
                {a.mood === 'sleepy' ? <Moon className="w-3 h-3" /> : a.mood === 'bored' ? <Coffee className="w-3 h-3" /> : <Brain className="w-3 h-3" />}
              </div>
              <div className="flex-1">
                <div className="text-[11px] font-mono uppercase tracking-wide text-zinc-500">{a.mood} • {a.type}</div>
                <div className="text-[13px] text-zinc-200 mt-1 leading-relaxed">{a.text}</div>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* hero */}
      <div className="relative z-10 px-6 md:px-10 pt-16 md:pt-24 pb-20 max-w-[1200px] mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-[760px]"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-[12px] text-violet-300">
            <Sparkles className="w-3.5 h-3.5" /> Agent that lives completely in frontend • v4: Canvas + Python + Companion
          </div>
          <h1 className="mt-6 text-[42px] md:text-[64px] font-[700] tracking-[-0.03em] leading-[0.95]">
            The AI that
            <br />
            <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-emerald-400 bg-clip-text text-transparent">never leaves</span>
            <br />
            your browser.
          </h1>
          <p className="mt-6 text-[16px] md:text-[18px] leading-[1.6] text-zinc-400 max-w-[560px]">
            FrontendAI is a fully autonomous agent OS that runs on WebGPU, IndexedDB, and browser APIs. No backend. No tracking. It reads pages, remembers forever, manages tasks, runs code — all in your tab.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <button onClick={onOpen} className="px-6 py-3 rounded-full bg-white text-black font-medium text-[14px] hover:bg-zinc-200 transition-colors flex items-center gap-2">
              <MessageSquare className="w-4 h-4" /> Talk to your agent
            </button>
            <div className="px-4 py-3 rounded-full bg-[#12121a] border border-[#1e1e2e] text-[13px] text-zinc-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Press ⌘K anywhere
            </div>
          </div>

          <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { icon: Eye, label: 'Page Tools', desc: 'read, query, highlight, extract' },
              { icon: Brain, label: 'Memory', desc: 'vector DB in IndexedDB' },
              { icon: Code, label: 'Code Exec', desc: 'sandboxed JS runtime' },
              { icon: Database, label: 'Vault', desc: 'notes, tasks, brain export' },
            ].map(f => (
              <div key={f.label} className="p-4 rounded-2xl bg-[#12121a]/80 border border-[#1e1e2e] backdrop-blur-xl">
                <f.icon className="w-5 h-5 text-zinc-400" />
                <div className="mt-3 font-medium text-[13px]">{f.label}</div>
                <div className="text-[11px] text-zinc-500 mt-1">{f.desc}</div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* demo preview */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mt-16 md:mt-24 grid md:grid-cols-3 gap-6"
        >
          <div className="md:col-span-2 p-6 rounded-[24px] bg-[#0a0a0f] border border-[#1e1e2e] overflow-hidden relative">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-3 h-3 rounded-full bg-red-500/80" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
              <div className="w-3 h-3 rounded-full bg-green-500/80" />
              <span className="ml-3 text-[11px] font-mono text-zinc-600">agent://loop.tsx • ReAct • frontend-only</span>
            </div>
            <pre className="text-[12px] font-mono leading-relaxed text-zinc-300 overflow-x-auto">
{`// Agent lives 100% in frontend
class FrontendAgent {
  memory = new Dexie('brain') // IndexedDB
  llm = new WebLLM('Llama-3.2-1B') // WebGPU
  tools = [readPage, remember, executeJS, ...]

  async *think(userInput) {
    const thought = await this.llm.reason(userInput)
    yield { thought }

    if (needsTools(thought)) {
      const result = await this.tools.exec(thought.tool)
      yield { action: result }
      return this.think(result) // loop
    }

    return thought.answer
  }
}

// No fetch to backend. Ever.
`}
            </pre>
            <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-[#0a0a0f] to-transparent pointer-events-none" />
          </div>

          <div className="space-y-4">
            {[
              { k: 'Privacy', v: 'Everything in IndexedDB, never leaves device', c: 'from-violet-500/20 to-fuchsia-500/20' },
              { k: 'Offline', v: 'Works without internet after model cached', c: 'from-emerald-500/20 to-teal-500/20' },
              { k: 'Extensible', v: 'Add tools with browser APIs', c: 'from-amber-500/20 to-orange-500/20' },
            ].map(card => (
              <div key={card.k} className={`p-5 rounded-2xl bg-gradient-to-br ${card.c} border border-white/5 backdrop-blur-xl`}>
                <div className="text-[12px] font-medium tracking-widest uppercase text-white/60">{card.k}</div>
                <div className="mt-2 text-[14px] leading-[1.4] text-white/90">{card.v}</div>
              </div>
            ))}
            <div className="p-4 rounded-2xl bg-[#12121a] border border-[#1e1e2e]">
              <div className="flex items-center gap-2 text-[12px] text-zinc-400"><Shield className="w-4 h-4" />Model Switcher</div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {['Mock (demo)','WebLLM local','OpenAI BYOK','Groq','Ollama'].map(m => (
                  <span key={m} className="px-2 py-1 rounded-full bg-[#1a1a26] border border-[#2a2a3e] text-[10px] font-mono text-zinc-500">{m}</span>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* features grid */}
        <div className="mt-24 border-t border-white/5 pt-16">
          <h2 className="text-[24px] font-semibold tracking-tight">What we should add next</h2>
          <p className="text-[14px] text-zinc-500 mt-2 max-w-[600px]">You asked what to add — here’s the full roadmap for a frontend-native agent that feels alive.</p>
          
          <div className="mt-8 grid md:grid-cols-3 gap-4">
            {[
              { title: '1. Living Presence', items: ['Floating orb with idle/breathing animations','Thought bubble when thinking','Voice via Web Speech API','Sleep when tab hidden, wake on return','Companion behaviors: curiosity, boredom, proactive nudges'] },
              { title: '2. Deep Page Integration', items: ['Shadow DOM overlay to annotate page','Follow user cursor, explain elements','Autofill forms with memory','Summarize any article with one click','Screenshot + vision via local model'] },
              { title: '3. Productivity OS', items: ['Notes with backlinks (like Obsidian)','Tasks with dependencies','Calendar via local storage','File System Access API vault','Canvas for drawing/thinking'] },
              { title: '4. Memory Palace', items: ['Vector search with transformers.js embeddings','Episodic memory (what happened)','Semantic memory (facts)','Procedural (how to do things)','Memory graph visualization','Export/import brain as JSON'] },
              { title: '5. Tool Universe', items: ['DOM: read, query, highlight, click, type','System: clipboard, notify, vibration, geolocation','Code: JS sandbox, WASM, WebContainer','AI: sub-agents spawning via Web Workers','P2P: WebRTC swarm for distributed compute'] },
              { title: '6. Model Layer', items: ['WebLLM: Llama 3.2, Phi-3.5, Gemma 2 via WebGPU','Transformers.js for embeddings + vision','BYOK: OpenAI, Anthropic, Groq direct fetch','Ollama local bridge','Model quantization & caching in OPFS'] },
            ].map(col => (
              <div key={col.title} className="p-5 rounded-2xl bg-[#12121a] border border-[#1e1e2e]">
                <h3 className="font-medium text-[14px] flex items-center gap-2"><Zap className="w-4 h-4 text-violet-400" />{col.title}</h3>
                <ul className="mt-3 space-y-2">
                  {col.items.map(it => (
                    <li key={it} className="text-[12px] text-zinc-500 leading-relaxed flex gap-2"><span className="text-violet-500/50">•</span>{it}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-16 p-6 rounded-[24px] bg-gradient-to-br from-violet-600/20 via-fuchsia-600/20 to-emerald-600/20 border border-violet-500/20 backdrop-blur-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <h3 className="text-[18px] font-semibold tracking-tight">Ready to make it feel alive?</h3>
            <p className="text-[13px] text-zinc-400 mt-1">Click the orb bottom-right or press ⌘K. It’s already running in mock mode, no setup needed.</p>
          </div>
          <button onClick={onOpen} className="px-6 py-3 rounded-full bg-white text-black font-medium text-[14px] hover:bg-zinc-100 transition-colors shrink-0 flex items-center gap-2">
            <Globe className="w-4 h-4" /> Open Agent OS
          </button>
        </div>

        <footer className="mt-20 pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-3 text-[11px] font-mono text-zinc-600">
          <span>FrontendAI • 100% frontend • Built with WebLLM, Dexie, Framer Motion • No backend, ever.</span>
          <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />agent is live in this tab</span>
        </footer>
      </div>
    </div>
  )
}

export default function App() {
  const { state, messages, send, clear, config, updateConfig } = useAgent()
  const companion = useCompanion(state)
  const [dockOpen, setDockOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)

  useEffect(() => {
    // Start auto-memory summarization + CRDT sync + Swarm
    startAutoSummarizer((mems) => {
      console.log('Auto-summary created', mems.length, 'memories')
    })
    try {
      getCRDT()
      getSwarm()
    } catch {}

    const handler = () => setPaletteOpen(o => !o)
    window.addEventListener('frontendai:toggle-palette' as any, handler)
    const keyHandler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen(o => !o)
      }
    }
    window.addEventListener('keydown', keyHandler)
    return () => {
      window.removeEventListener('frontendai:toggle-palette' as any, handler)
      window.removeEventListener('keydown', keyHandler)
    }
  }, [])

  return (
    <>
      <Landing onOpen={() => setDockOpen(true)} companionMood={companion.mood} companionActions={companion.actions} />
      <AgentOrb state={state} onClick={() => setDockOpen(o => !o)} isOpen={dockOpen} mood={companion.mood} />
      <AgentDock
        open={dockOpen}
        onClose={() => setDockOpen(false)}
        state={state}
        messages={messages}
        onSend={send}
        onClear={clear}
        config={config}
        updateConfig={updateConfig}
      />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} onSelect={(t) => { if (t) send(t); setDockOpen(true) }} />
    </>
  )
}
