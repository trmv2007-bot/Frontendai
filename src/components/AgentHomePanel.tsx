import { ArrowUp, Brain, CheckCircle2, Eye, Hammer, Mic, Pause, Search, Sparkles, Square, Wand2 } from 'lucide-react'
import { useState } from 'react'
import { taskRuntime } from '../agent/core/taskRuntime'
import type { AgentState } from '../agent/types'
import { useEnvironmentContext } from '../agent/environment/reactive'
import { cn } from '../lib/utils'

const suggestions = [
  { label: 'Inspect page', icon: Eye, prompt: 'Inspect the current page and tell me what needs attention.' },
  { label: 'Fix issues', icon: Wand2, prompt: 'Find and fix the most important issues in the current page.' },
  { label: 'Run tests', icon: CheckCircle2, prompt: 'Run the available tests and fix any failures.' },
  { label: 'Improve design', icon: Sparkles, prompt: 'Improve the current design while preserving its intent.' },
]

export function AgentHomePanel({ state, mode, onModeChange, onSend }: { state: AgentState; mode: 'assist' | 'autonomous'; onModeChange: (mode: 'assist' | 'autonomous') => void; onSend: (text: string) => void }) {
  const [value, setValue] = useState('')
  const context = useEnvironmentContext()
  const working = ['thinking', 'acting', 'observing'].includes(state.status)
  const paused = state.status === 'paused' || state.taskStatus === 'paused'

  const send = (text: string) => {
    const trimmed = text.trim()
    if (!trimmed) return
    onSend(trimmed)
    setValue('')
  }

  return <div className="flex-1 overflow-y-auto p-5 bg-[radial-gradient(circle_at_70%_0%,rgba(124,58,237,.12),transparent_40%)]">
    <div className="max-w-xl mx-auto">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[.18em] text-violet-300/80"><Sparkles className="w-3.5 h-3.5" /> FrontendAI</div>
          <h3 className="mt-2 text-2xl font-semibold tracking-tight text-white">What should I work on?</h3>
          <p className="mt-1 text-sm text-zinc-500">{context.route || 'Current workspace'} {context.activeTask ? `• ${context.activeTask.objective}` : ''}</p>
        </div>
        <div className="w-10 h-10 rounded-2xl border border-violet-400/20 bg-violet-500/10 flex items-center justify-center"><Brain className="w-5 h-5 text-violet-300" /></div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[.035] shadow-2xl overflow-hidden focus-within:border-violet-400/40 focus-within:ring-1 focus-within:ring-violet-400/20 transition-all">
        <textarea value={value} onChange={e => setValue(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); send(value) } }} placeholder="Tell FrontendAI the outcome you want…" className="w-full min-h-[104px] resize-none bg-transparent px-4 pt-4 text-[14px] leading-6 text-white placeholder:text-zinc-600 outline-none" />
        <div className="flex items-center justify-between px-3 pb-3">
          <div className="flex items-center gap-1.5"><button className="w-8 h-8 rounded-lg border border-white/10 text-zinc-500 hover:text-zinc-200 hover:bg-white/5" title="Voice"><Mic className="w-4 h-4 mx-auto" /></button><span className="text-[10px] text-zinc-600">⌘↵ to run</span></div>
          <button onClick={() => send(value)} disabled={!value.trim()} className="w-9 h-9 rounded-xl bg-white text-black disabled:opacity-30 flex items-center justify-center hover:bg-violet-100 transition-colors"><ArrowUp className="w-4 h-4" /></button>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between rounded-xl border border-white/8 bg-black/10 p-1.5">
        <div className="flex rounded-lg bg-black/20 p-0.5"><button onClick={() => onModeChange('assist')} className={cn('px-3 py-1.5 rounded-md text-[11px] transition-all', mode === 'assist' ? 'bg-white text-black shadow' : 'text-zinc-500 hover:text-zinc-300')}>Assist</button><button onClick={() => onModeChange('autonomous')} className={cn('px-3 py-1.5 rounded-md text-[11px] transition-all', mode === 'autonomous' ? 'bg-violet-500 text-white shadow' : 'text-zinc-500 hover:text-zinc-300')}>Autonomous</button></div>
        {working && <div className="flex items-center gap-1.5"><button onClick={() => taskRuntime.pause()} className="px-2.5 py-1.5 rounded-md text-[10px] text-amber-300 bg-amber-500/10 border border-amber-400/10">Pause</button><button onClick={() => taskRuntime.stop()} className="px-2.5 py-1.5 rounded-md text-[10px] text-red-300 bg-red-500/10 border border-red-400/10"><Square className="w-3 h-3 inline mr-1" />Stop</button></div>}
        {paused && <button onClick={() => taskRuntime.resume()} className="px-3 py-1.5 rounded-md text-[10px] text-emerald-300 bg-emerald-500/10 border border-emerald-400/10">Resume</button>}
      </div>

      <div className="mt-7"><div className="flex items-center gap-2 mb-3 text-[10px] uppercase tracking-widest text-zinc-600"><Search className="w-3 h-3" /> Quick actions</div><div className="grid grid-cols-2 gap-2">{suggestions.map(item => { const Icon = item.icon; return <button key={item.label} onClick={() => send(item.prompt)} className="group flex items-center gap-3 rounded-xl border border-white/8 bg-white/[.025] p-3 text-left hover:bg-white/[.06] hover:border-white/15 transition-all"><span className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-zinc-400 group-hover:text-violet-300"><Icon className="w-4 h-4" /></span><span className="text-[12px] text-zinc-300">{item.label}</span></button> })}</div></div>

      <div className="mt-7 rounded-xl border border-white/8 bg-black/10 p-3 flex items-center gap-3"><div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center"><Hammer className="w-4 h-4 text-emerald-300" /></div><div className="min-w-0 flex-1"><div className="text-[11px] text-zinc-300">Agent status</div><div className="text-[10px] text-zinc-600 truncate">{state.currentThought || (working ? 'Working on your task…' : 'Ready when you are.')}</div></div><span className="text-[10px] uppercase tracking-widest text-zinc-600">{state.status}</span></div>
    </div>
  </div>
}
