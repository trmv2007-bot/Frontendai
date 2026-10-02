import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import { X, MessageSquare, Wrench, Settings, Command, Sparkles, Activity, Cpu, Eye, Share2, Palette, Terminal, FolderOpen, Bot, Radio, Database, Box, Clock, Users, FileSearch, Mic2, Puzzle, HardDrive, Package, Pause, Play, Square, Hand, Brain, Network, History, LayoutDashboard } from 'lucide-react'
import type { AgentState, Message } from '../agent/types'
import { taskRuntime } from '../agent/core/taskRuntime'
import { Chat } from './Chat'
import { ThoughtStream } from './ThoughtStream'
import { ToolTimeline } from './ToolTimeline'
import { AgentActivityPanel } from './AgentActivityPanel'
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
import { OPFSPanel } from './FileSystem/OPFSPanel'
import { SwarmPanel } from './SwarmPanel'
import { SubAgentsPanel } from './SubAgentsPanel'
import { WebContainerPanel } from './WebContainerPanel'
import { AutoMemoryPanel } from './AutoMemoryPanel'
import { MultiAgentPanel } from './MultiAgentPanel'
import { RAGPanel } from './RAG/RAGPanel'
import { VoiceClonePanel } from './VoiceClonePanel'
import { PluginMarketplace } from './Plugins/PluginMarketplace'
import { VoiceToVoicePanel } from './VoiceToVoicePanel'
import { CRDTPanel } from './CRDTPanel'
import { ExportPanel } from './Export/ExportPanel'
import { AgentEnvironmentPanel } from './AgentEnvironmentPanel'
import { AgentReplayPanel } from './AgentReplayPanel'
import { AgentWorkspacePanel } from './AgentWorkspacePanel'
import { cn } from '../lib/utils'

type Tab = 'chat' | 'activity' | 'environment' | 'replay' | 'workspace' | 'v2v' | 'multi' | 'rag' | 'clone' | 'plugins' | 'crdt' | 'export' | 'vision' | 'voice' | 'canvas' | 'python' | 'node' | 'files' | 'opfs' | 'swarm' | 'subagents' | 'graph' | 'auto' | 'thoughts' | 'tools' | 'vault' | 'notes' | 'tasks' | 'settings'
const TABS: { id: Tab, label: string, icon: any, desc: string }[] = [
  { id: 'chat', label: 'Chat', icon: MessageSquare, desc: 'Talk' }, { id: 'activity', label: 'Activity', icon: Activity, desc: 'Live work' }, { id: 'environment', label: 'Environment', icon: Network, desc: 'Agent world' }, { id: 'replay', label: 'Replay', icon: History, desc: 'Task history' }, { id: 'workspace', label: 'Workspace', icon: LayoutDashboard, desc: 'Task UI' }, { id: 'v2v', label: 'V2V', icon: Radio, desc: 'Voice-to-voice' }, { id: 'multi', label: 'Team', icon: Users, desc: 'Multi-agent' }, { id: 'rag', label: 'RAG', icon: FileSearch, desc: 'Files RAG' }, { id: 'clone', label: 'Clone', icon: Mic2, desc: 'Voice clone' }, { id: 'plugins', label: 'Plugins', icon: Puzzle, desc: 'Marketplace' }, { id: 'crdt', label: 'CRDT', icon: HardDrive, desc: 'Multi-tab sync' }, { id: 'export', label: 'Export', icon: Package, desc: 'PWA • Ext • Single' }, { id: 'vision', label: 'Vision', icon: Eye, desc: 'See' }, { id: 'canvas', label: 'Canvas', icon: Palette, desc: 'Draw' }, { id: 'python', label: 'Python', icon: Terminal, desc: 'Pyodide' }, { id: 'node', label: 'Node', icon: Box, desc: 'WebContainer' }, { id: 'files', label: 'Files', icon: FolderOpen, desc: 'FS API' }, { id: 'opfs', label: 'OPFS', icon: Database, desc: 'Private FS' }, { id: 'swarm', label: 'Swarm', icon: Radio, desc: 'P2P' }, { id: 'subagents', label: 'Workers', icon: Bot, desc: 'Sub-agents' }, { id: 'graph', label: 'Graph', icon: Share2, desc: 'Graph' }, { id: 'auto', label: 'AutoMem', icon: Clock, desc: 'Summarize' }, { id: 'vault', label: 'Vault', icon: Sparkles, desc: 'Memory' }, { id: 'tools', label: 'Tools', icon: Wrench, desc: 'Actions' }, { id: 'settings', label: 'OS', icon: Settings, desc: 'System' },
]

export function AgentDock({ open, onClose, state, messages, onSend, onClear, config, updateConfig }: { open: boolean; onClose: () => void; state: AgentState; messages: Message[]; onSend: (t: string, mode?: 'assist' | 'autonomous') => void; onClear: () => void; config: any; updateConfig: (p: any) => void }) {
  const [tab, setTab] = useState<Tab>('chat')
  const [mode, setMode] = useState<'assist' | 'autonomous'>(state.taskMode || 'assist')
  const working = ['thinking', 'acting', 'observing'].includes(state.status)
  const paused = state.status === 'paused' || state.taskStatus === 'paused'
  const pause = () => taskRuntime.pause()
  const resume = () => taskRuntime.resume()
  const stop = () => taskRuntime.stop()
  return <AnimatePresence>{open && <>
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-[90]" onClick={onClose} />
    <motion.div initial={{ x: '100%', opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: '100%', opacity: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 30 }} className="fixed top-0 right-0 h-[100dvh] w-[min(520px,100vw)] z-[95] flex flex-col bg-[#0a0a0f]/90 backdrop-blur-2xl border-l border-[#1e1e2e] shadow-[-20px_0_80px_rgba(0,0,0,0.8)]">
      <div className="h-[64px] shrink-0 flex items-center justify-between px-5 border-b border-[#1e1e2e] bg-[#12121a]/80"><div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center"><Cpu className="w-4 h-4 text-white" /></div><div><div className="flex items-center gap-2"><h2 className="font-semibold tracking-tight text-[14px]">FrontendAI OS</h2><span className={cn('px-1.5 py-0.5 rounded-full text-[10px] font-medium border', state.status === 'idle' ? 'bg-violet-500/10 text-violet-300 border-violet-500/20' : state.status === 'thinking' ? 'bg-amber-500/10 text-amber-300 border-amber-500/20' : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20')}>{state.status}</span></div><div className="flex items-center gap-2 text-[11px] text-zinc-500"><span className="flex items-center gap-1"><Activity className="w-3 h-3" />{state.memoryCount} memories</span><span>•</span><span className="flex items-center gap-1"><Command className="w-3 h-3" />⌘K</span></div></div></div><button onClick={onClose} className="w-8 h-8 rounded-full bg-[#1a1a26] hover:bg-[#232334] border border-[#2a2a3e] flex items-center justify-center transition-colors"><X className="w-4 h-4" /></button></div>
      <div className="shrink-0 px-3 py-2 border-b border-[#1e1e2e] bg-[#0d0d14] flex items-center gap-2"><div className="flex rounded-xl border border-[#2a2a3e] bg-[#12121a] p-0.5"><button onClick={() => setMode('assist')} className={cn('px-3 py-1.5 rounded-lg text-[11px] flex items-center gap-1.5', mode === 'assist' ? 'bg-white text-black' : 'text-zinc-500')}><Hand className="w-3 h-3" />Assist</button><button onClick={() => setMode('autonomous')} className={cn('px-3 py-1.5 rounded-lg text-[11px] flex items-center gap-1.5', mode === 'autonomous' ? 'bg-violet-500 text-white' : 'text-zinc-500')}><Brain className="w-3 h-3" />Autonomous</button></div><div className="ml-auto flex gap-1">{working && <button onClick={pause} title="Pause" className="w-8 h-8 rounded-lg border border-[#2a2a3e] bg-[#151520] flex items-center justify-center text-zinc-300 hover:bg-[#20202d]"><Pause className="w-3.5 h-3.5" /></button>}{paused && <button onClick={resume} title="Resume" className="w-8 h-8 rounded-lg border border-emerald-500/20 bg-emerald-500/10 flex items-center justify-center text-emerald-300"><Play className="w-3.5 h-3.5" /></button>}{(working || paused) && <button onClick={stop} title="Stop" className="w-8 h-8 rounded-lg border border-red-500/20 bg-red-500/10 flex items-center justify-center text-red-300"><Square className="w-3 h-3" /></button>}</div></div>
      <div className="shrink-0 flex gap-1 p-2 border-b border-[#1e1e2e] overflow-x-auto scrollbar-none">{TABS.map(t => { const Icon = t.icon; const active = tab === t.id; return <button key={t.id} onClick={() => setTab(t.id)} className={cn('flex items-center gap-1.5 px-3 py-2 rounded-full text-[12px] font-medium transition-all whitespace-nowrap border', active ? 'bg-white text-black border-white shadow-lg' : 'bg-[#1a1a26] text-zinc-400 border-[#2a2a3e] hover:text-zinc-200 hover:bg-[#232334]')}><Icon className="w-3.5 h-3.5" />{t.label}</button> })}</div>
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">{tab === 'chat' && <Chat messages={messages} onSend={(text) => onSend(text, mode)} onClear={onClear} state={state} />}{tab === 'activity' && <AgentActivityPanel />}{tab === 'environment' && <AgentEnvironmentPanel />}{tab === 'replay' && <AgentReplayPanel />}{tab === 'workspace' && <AgentWorkspacePanel />}{tab === 'v2v' && <VoiceToVoicePanel onSend={async (text) => { onSend(text, mode); return 'Got it, responding via voice!'; }} />}{tab === 'multi' && <MultiAgentPanel />}{tab === 'rag' && <RAGPanel />}{tab === 'clone' && <VoiceClonePanel />}{tab === 'plugins' && <PluginMarketplace />}{tab === 'crdt' && <CRDTPanel />}{tab === 'export' && <ExportPanel />}{tab === 'vision' && <div className="flex-1 overflow-y-auto p-4"><VisionPanel onAnalyze={(r) => onSend(`Vision analysis: ${r}`, mode)} /></div>}{tab === 'voice' && <div className="flex-1 overflow-y-auto p-4 space-y-6"><VoiceControl onTranscript={(t) => onSend(t, mode)} /><div className="border-t border-[#1e1e2e] pt-6"><h4 className="text-[12px] font-medium uppercase tracking-widest text-zinc-500 mb-3">Local Whisper</h4><WhisperControl onTranscript={(t) => onSend(t, mode)} /></div></div>}{tab === 'canvas' && <CanvasBoard />}{tab === 'python' && <PythonREPL />}{tab === 'node' && <WebContainerPanel />}{tab === 'files' && <FileVault />}{tab === 'opfs' && <OPFSPanel />}{tab === 'swarm' && <SwarmPanel />}{tab === 'subagents' && <SubAgentsPanel />}{tab === 'graph' && <MemoryGraph />}{tab === 'auto' && <AutoMemoryPanel />}{tab === 'thoughts' && <ThoughtStream messages={messages} state={state} />}{tab === 'tools' && <ToolTimeline messages={messages} />}{tab === 'vault' && <MemoryVault />}{tab === 'notes' && <Notes />}{tab === 'tasks' && <Tasks />}{tab === 'settings' && <ModelSwitcher config={config} updateConfig={updateConfig} state={state} />}</div>
      <div className="shrink-0 p-3 border-t border-[#1e1e2e] bg-[#12121a]/50"><div className="flex items-center justify-between text-[11px]"><span className="text-zinc-500">Autonomy</span><span className="text-zinc-300 font-mono">{['Ask always','Confirm risky','Auto safe','Full auto'][state.autonomy]}</span></div><div className="mt-2 flex gap-1">{[0,1,2,3].map(l => <button key={l} onClick={() => { localStorage.setItem('frontendai_autonomy',''+l); location.reload() }} className={cn('flex-1 h-1.5 rounded-full transition-all', state.autonomy >= l ? 'bg-violet-500' : 'bg-[#2a2a3e]')} />)}</div><div className="mt-3 flex items-center justify-between text-[10px] text-zinc-600 font-mono"><span>100% frontend • IndexedDB • WebGPU • Yjs CRDT</span><span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />live</span></div></div>
    </motion.div>
  </>}</AnimatePresence>
}