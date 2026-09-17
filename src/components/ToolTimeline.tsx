import type { Message } from '../agent/types'
import { Wrench, Check, X, Clock, Eye, Brain, FileText, Code, Bell, StickyNote } from 'lucide-react'
import { motion } from 'framer-motion'

const ICON_MAP: any = {
  readPage: Eye,
  queryDOM: Eye,
  highlightElement: Eye,
  extractArticle: FileText,
  createNote: StickyNote,
  searchMemory: Brain,
  remember: Brain,
  getTime: Clock,
  executeJS: Code,
  notify: Bell,
  default: Wrench
}

export function ToolTimeline({ messages }: { messages: Message[] }) {
  const toolCalls = messages.flatMap(m => (m.toolCalls || []).map(tc => ({ ...tc, parentId: m.id, timestamp: m.timestamp }))).reverse()

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[12px] font-medium text-zinc-400 uppercase tracking-widest">
          <Wrench className="w-4 h-4" /> Tool Timeline • {toolCalls.length} calls
        </div>
        <span className="text-[10px] px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-mono">live execution</span>
      </div>

      {toolCalls.length === 0 ? (
        <div className="py-16 text-center">
          <div className="w-12 h-12 mx-auto rounded-full bg-[#1a1a26] border border-[#2a2a3e] flex items-center justify-center mb-3">
            <Wrench className="w-6 h-6 text-zinc-600" />
          </div>
          <p className="text-[13px] text-zinc-500">No tool calls yet.</p>
          <p className="text-[11px] text-zinc-600 mt-1">Try "read this page" or "calculate 2+2"</p>
        </div>
      ) : (
        <div className="space-y-3">
          {toolCalls.map((tc, i) => {
            const Icon = ICON_MAP[tc.name] || ICON_MAP.default
            return (
              <motion.div
                key={`${tc.parentId}-${tc.id}-${i}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="p-3 rounded-xl bg-[#1a1a26] border border-[#2a2a3e] hover:border-[#3a3a4e] transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${
                      tc.status === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                      tc.status === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                      tc.status === 'running' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                      'bg-[#232334] border-[#2a2a3e] text-zinc-400'
                    }`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-medium text-zinc-200 font-mono">{tc.name}</span>
                        {tc.status === 'success' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                        {tc.status === 'error' && <X className="w-3.5 h-3.5 text-red-400" />}
                        {tc.status === 'running' && <Clock className="w-3.5 h-3.5 text-amber-400 animate-spin" />}
                      </div>
                      <div className="text-[11px] text-zinc-500 font-mono mt-0.5">{new Date(tc.timestamp).toLocaleTimeString()} • {tc.id}</div>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                    tc.status === 'success' ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' :
                    tc.status === 'error' ? 'bg-red-500/10 text-red-300 border-red-500/20' :
                    'bg-amber-500/10 text-amber-300 border-amber-500/20'
                  }`}>{tc.status}</span>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="p-2 rounded-lg bg-[#12121a] border border-[#1e1e2e]">
                    <div className="text-[10px] uppercase tracking-wide text-zinc-500 mb-1">Arguments</div>
                    <pre className="text-[11px] font-mono text-zinc-300 whitespace-pre-wrap break-words">{JSON.stringify(tc.arguments, null, 2).slice(0,500)}</pre>
                  </div>
                  <div className="p-2 rounded-lg bg-[#12121a] border border-[#1e1e2e]">
                    <div className="text-[10px] uppercase tracking-wide text-zinc-500 mb-1">Result</div>
                    <pre className="text-[11px] font-mono text-zinc-300 whitespace-pre-wrap break-words max-h-[120px] overflow-y-auto">{tc.result ? JSON.stringify(tc.result, null, 2).slice(0,800) : 'pending...'}</pre>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      <div className="p-3 rounded-xl bg-[#12121a] border border-[#1e1e2e]">
        <h4 className="text-[12px] font-medium text-zinc-300">Available Tools (all frontend)</h4>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {['readPage','queryDOM','highlightElement','extractArticle','createNote','createTask','searchMemory','remember','getTime','clipboardWrite','executeJS','setAutonomy'].map(name => (
            <span key={name} className="px-2 py-1 rounded-full bg-[#1a1a26] border border-[#2a2a3e] text-[10px] font-mono text-zinc-500">{name}</span>
          ))}
        </div>
      </div>
    </div>
  )
}
