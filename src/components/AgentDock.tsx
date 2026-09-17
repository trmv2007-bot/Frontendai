import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import { X, MessageSquare, Brain, Wrench, StickyNote, CheckSquare, Settings, Command, Sparkles, Activity, Cpu, Eye, Mic, Share2, FileAudio, Palette, Terminal, FolderOpen, Bot, Radio } from 'lucide-react'
import type { AgentState, Message } from '../agent/types'
import { Chat } from './Chat'
import { ThoughtStream } from './ThoughtStream'
import { ToolTimeline } from './ToolTimeline'
import { MemoryVault } from './MemoryVault'
import { Notes } from './Productivity/Notes'
import { Tasks } from './Productivity/Tasks'
import { ModelSwitcher } from './Settings/ModelSwitcher'
import { VisionPanel } from './VisionPanel'
import { VoiceControl } from './VoiceControl'
import { MemoryGraph } from './MemoryGraph'
import { WhisperControl } from './WhisperControl'
import { CanvasBoard } from './CanvasBoard'
import { PythonREPL } from './PythonREPL'
import { FileVault } from './FileSystem/FileVault'
import { SwarmPanel } from './SwarmPanel'
import { SubAgentsPanel } from './SubAgentsPanel'
import { cn } from '../lib/utils'

type Tab = 'chat' | 'vision' | 'voice' | 'whisper' | 'canvas' | 'python' | 'files' | 'swarm' | 'subagents' | 'graph' | 'thoughts' | 'tools' | 'vault' | 'notes' | 'tasks' | 'settings'

const TABS: { id: Tab, label: string, icon: any, desc: string }[] = [
  { id: 'chat', label: 'Chat', icon: MessageSquare, desc: 'Talk' },
  { id: 'vision', label: 'Vision', icon: Eye, desc: 'See' },
  { id: 'voice', label: 'Voice', icon: Mic, desc: 'Speak' },
  { id: 'canvas', label: 'Canvas', icon: Palette, desc: 'Draw' },
  { id: 'python', label: 'Python', icon: Terminal, desc: 'Pyodide' },
  { id: 'files', label: 'Files', icon: FolderOpen, desc: 'FS API' },
  { id: 'swarm', label: 'Swarm', icon: Radio, desc: 'P2P' },
  { id: 'subagents', label: 'Workers', icon: Bot, desc: 'Sub-agents' },
  { id: 'graph', label: 'Graph', icon: Share2, desc: 'Graph' },
  { id: 'vault', label: 'Vault', icon: Sparkles, desc: 'Memory' },
  { id: 'tools', label: 'Tools', icon: Wrench, desc: 'Actions' },
  { id: 'settings', label: 'OS', icon: Settings, desc: 'System' },
]

export function AgentDock({ 
  open, 
  onClose, 
  state, 
  messages, 
  onSend,
  onClear,
  config,
  updateConfig
}: { 
  open: boolean
  onClose: () => void
  state: AgentState
  messages: Message[]
  onSend: (t: string) => void
  onClear: () => void
  config: any
  updateConfig: (p: any) => void
}) {
  const [tab, setTab] = useState<Tab>('chat')

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-[90]"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed top-0 right-0 h-[100dvh] w-[min(480px,100vw)] z-[95] flex flex-col bg-[#0a0a0f]/90 backdrop-blur-2xl border-l border-[#1e1e2e] shadow-[-20px_0_80px_rgba(0,0,0,0.8)]"
          >
            {/* header */}
            <div className="h-[64px] shrink-0 flex items-center justify-between px-5 border-b border-[#1e1e2e] bg-[#12121a]/80">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
                  <Cpu className="w-4 h-4 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-semibold tracking-tight text-[14px]">FrontendAI OS</h2>
                    <span className={cn(
                      "px-1.5 py-0.5 rounded-full text-[10px] font-medium border",
                      state.status === 'idle' ? "bg-violet-500/10 text-violet-300 border-violet-500/20" :
                      state.status === 'thinking' ? "bg-amber-500/10 text-amber-300 border-amber-500/20" :
                      "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
                    )}>{state.status}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                    <span className="flex items-center gap-1"><Activity className="w-3 h-3" />{state.memoryCount} memories</span>
                    <span>•</span>
                    <span className="flex items-center gap-1"><Command className="w-3 h-3" />⌘K</span>
                  </div>
                </div>
              </div>
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-[#1a1a26] hover:bg-[#232334] border border-[#2a2a3e] flex items-center justify-center transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* tabs */}
            <div className="shrink-0 flex gap-1 p-2 border-b border-[#1e1e2e] overflow-x-auto scrollbar-none">
              {TABS.map(t => {
                const Icon = t.icon
                const active = tab === t.id
                return (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-2 rounded-full text-[12px] font-medium transition-all whitespace-nowrap border",
                      active 
                        ? "bg-white text-black border-white shadow-lg" 
                        : "bg-[#1a1a26] text-zinc-400 border-[#2a2a3e] hover:text-zinc-200 hover:bg-[#232334]"
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {t.label}
                  </button>
                )
              })}
            </div>

            {/* content */}
            <div className="flex-1 overflow-hidden flex flex-col min-h-0">
              {tab === 'chat' && <Chat messages={messages} onSend={onSend} onClear={onClear} state={state} />}
              {tab === 'vision' && <div className="flex-1 overflow-y-auto p-4"><VisionPanel onAnalyze={(r) => onSend(`Vision analysis: ${r}`)} /></div>}
              {tab === 'voice' && <div className="flex-1 overflow-y-auto p-4 space-y-6"><VoiceControl onTranscript={(t) => onSend(t)} /><div className="border-t border-[#1e1e2e] pt-6"><h4 className="text-[12px] font-medium uppercase tracking-widest text-zinc-500 mb-3">Local Whisper</h4><WhisperControl onTranscript={(t) => onSend(t)} /></div></div>}
              {tab === 'canvas' && <CanvasBoard />}
              {tab === 'python' && <PythonREPL />}
              {tab === 'files' && <FileVault />}
              {tab === 'swarm' && <SwarmPanel />}
              {tab === 'subagents' && <SubAgentsPanel />}
              {tab === 'graph' && <MemoryGraph />}
              {tab === 'thoughts' && <ThoughtStream messages={messages} state={state} />}
              {tab === 'tools' && <ToolTimeline messages={messages} />}
              {tab === 'vault' && <MemoryVault />}
              {tab === 'notes' && <Notes />}
              {tab === 'tasks' && <Tasks />}
              {tab === 'settings' && <ModelSwitcher config={config} updateConfig={updateConfig} state={state} />}
            </div>

            {/* footer - autonomy slider */}
            <div className="shrink-0 p-3 border-t border-[#1e1e2e] bg-[#12121a]/50">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-zinc-500">Autonomy</span>
                <span className="text-zinc-300 font-mono">{['Ask always','Confirm risky','Auto safe','Full auto'][state.autonomy]}</span>
              </div>
              <div className="mt-2 flex gap-1">
                {[0,1,2,3].map(l => (
                  <button
                    key={l}
                    onClick={() => {
                      localStorage.setItem('frontendai_autonomy',''+l)
                      location.reload()
                    }}
                    className={cn(
                      "flex-1 h-1.5 rounded-full transition-all",
                      state.autonomy >= l ? "bg-violet-500" : "bg-[#2a2a3e]"
                    )}
                  />
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between text-[10px] text-zinc-600 font-mono">
                <span>100% frontend • IndexedDB • WebGPU</span>
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />live</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
