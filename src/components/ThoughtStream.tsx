import type { Message, AgentState } from '../agent/types'
import { motion } from 'framer-motion'
import { Brain, Lightbulb, Search, Zap } from 'lucide-react'

export function ThoughtStream({ messages, state }: { messages: Message[], state: AgentState }) {
  const thoughts = messages.filter(m => m.thought).slice(-20).reverse()

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      <div className="flex items-center gap-2 text-[12px] font-medium text-zinc-400 uppercase tracking-widest">
        <Brain className="w-4 h-4" /> Chain of Thought • {thoughts.length} traces
      </div>

      <div className="relative">
        <div className="absolute left-[15px] top-0 bottom-0 w-px bg-gradient-to-b from-violet-500/50 via-[#2a2a3e] to-transparent" />
        <div className="space-y-4">
          {state.currentThought && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="relative pl-10"
            >
              <div className="absolute left-0 top-1 w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
                <Zap className="w-4 h-4 text-amber-400 animate-pulse" />
              </div>
              <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/10">
                <div className="text-[11px] font-mono text-amber-300/80 uppercase tracking-wide">Now thinking</div>
                <div className="text-[13px] text-zinc-200 mt-1 leading-relaxed">{state.currentThought}</div>
              </div>
            </motion.div>
          )}

          {thoughts.map((m, i) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="relative pl-10"
            >
              <div className="absolute left-0 top-1 w-8 h-8 rounded-full bg-[#1a1a26] border border-[#2a2a3e] flex items-center justify-center">
                {i % 3 === 0 ? <Lightbulb className="w-4 h-4 text-violet-400" /> : i % 3 === 1 ? <Search className="w-4 h-4 text-emerald-400" /> : <Brain className="w-4 h-4 text-zinc-400" />}
              </div>
              <div className="p-3 rounded-xl bg-[#1a1a26] border border-[#2a2a3e]">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono text-zinc-500">{new Date(m.timestamp).toLocaleTimeString()} • {m.role}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#232334] border border-[#2a2a3e] text-zinc-500">{m.thought!.length} chars</span>
                </div>
                <div className="text-[12px] font-mono text-zinc-300 mt-2 leading-relaxed whitespace-pre-wrap">{m.thought}</div>
                {m.content && (
                  <div className="mt-2 text-[12px] text-zinc-400 border-t border-[#2a2a3e] pt-2">{m.content.slice(0,200)}</div>
                )}
              </div>
            </motion.div>
          ))}

          {thoughts.length === 0 && !state.currentThought && (
            <div className="pl-10 py-10 text-center">
              <div className="w-12 h-12 mx-auto rounded-full bg-[#1a1a26] border border-[#2a2a3e] flex items-center justify-center mb-3">
                <Brain className="w-6 h-6 text-zinc-600" />
              </div>
              <p className="text-[13px] text-zinc-500">No thoughts yet. Start chatting and watch the ReAct loop.</p>
              <p className="text-[11px] text-zinc-600 mt-2 font-mono">Thought → Action → Observation → Repeat</p>
            </div>
          )}
        </div>
      </div>

      <div className="p-3 rounded-xl bg-violet-500/5 border border-violet-500/10">
        <h4 className="text-[12px] font-medium text-violet-300 flex items-center gap-1.5"><Zap className="w-3.5 h-3.5" />How it works (frontend only)</h4>
        <ul className="mt-2 space-y-1 text-[11px] text-zinc-500 leading-relaxed list-disc pl-4">
          <li>ReAct loop runs in main thread, no backend</li>
          <li>Thoughts streamed from LLM adapter (WebLLM/BYOK/Mock)</li>
          <li>Tool calls executed via browser APIs</li>
          <li>Memory stored in IndexedDB + vector search</li>
        </ul>
      </div>
    </div>
  )
}
