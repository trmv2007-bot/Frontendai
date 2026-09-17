import { useEffect, useState } from 'react'
import { getCollab, PERSONAS, type CollaborationSession } from '../agent/collaboration/multiAgent'
import { Bot, Play, Users, Zap, Brain, MessageSquare, X } from 'lucide-react'
import { motion } from 'framer-motion'

export function MultiAgentPanel() {
  const collab = getCollab()
  const [sessions, setSessions] = useState<CollaborationSession[]>([])
  const [goalInput, setGoalInput] = useState('')
  const [selectedPersonas, setSelectedPersonas] = useState<string[]>(['researcher', 'coder', 'critic'])
  const [selectedSession, setSelectedSession] = useState<string | null>(null)

  useEffect(() => {
    const unsub = collab.subscribe(setSessions)
    return () => { unsub() }
  }, [])

  const create = () => {
    if (!goalInput.trim()) return
    const session = collab.createSession(goalInput.trim(), selectedPersonas)
    setSelectedSession(session.id)
    setGoalInput('')
  }

  const currentSession = selectedSession ? sessions.find(s => s.id === selectedSession) : sessions[0]

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="shrink-0 p-3 border-b border-[#1e1e2e] space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
            <Users className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-[13px] font-medium">Multi-Agent Collab • Personas Chat Together</h3>
            <p className="text-[11px] text-zinc-500">Researcher, Coder, Critic, Creative, Planner collaborate on goal, 100% frontend</p>
          </div>
        </div>

        <div className="flex gap-2">
          <input
            value={goalInput}
            onChange={e=>setGoalInput(e.target.value)}
            onKeyDown={e=>e.key==='Enter' && create()}
            placeholder="Goal for team, e.g. 'Design a privacy-first todo app that lives in frontend'"
            className="flex-1 h-9 px-3 rounded-full bg-[#1a1a26] border border-[#2a2a3e] text-[12px] focus:outline-none focus:border-violet-500/50"
          />
          <button onClick={create} className="h-9 px-4 rounded-full bg-white text-black text-[12px] font-medium flex items-center gap-1.5">
            <Play className="w-3.5 h-3.5" /> Collaborate
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {PERSONAS.map(p => {
            const selected = selectedPersonas.includes(p.id)
            return (
              <button
                key={p.id}
                onClick={() => setSelectedPersonas(prev => selected ? prev.filter(id => id !== p.id) : [...prev, p.id])}
                className={`px-2.5 py-1.5 rounded-full text-[11px] font-medium border flex items-center gap-1 transition-colors ${
                  selected ? 'bg-white text-black border-white' : 'bg-[#1a1a26] text-zinc-500 border-[#2a2a3e] hover:text-zinc-300'
                }`}
              >
                <span>{p.avatar}</span> {p.name} <span className="opacity-60">({p.role})</span>
              </button>
            )
          })}
        </div>

        <div className="flex gap-1 overflow-x-auto">
          {sessions.map(s => (
            <button
              key={s.id}
              onClick={() => setSelectedSession(s.id)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-mono border whitespace-nowrap flex items-center gap-1.5 ${
                selectedSession === s.id || (!selectedSession && s === sessions[0]) ? 'bg-violet-600/20 border-violet-500/30 text-violet-300' : 'bg-[#1a1a26] border-[#2a2a3e] text-zinc-500'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${s.status==='running' ? 'bg-amber-500 animate-pulse' : s.status==='done' ? 'bg-emerald-500' : 'bg-zinc-600'}`} />
              {s.goal.slice(0,30)}...
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {!currentSession ? (
          <div className="py-16 text-center">
            <Users className="w-10 h-10 mx-auto text-zinc-700 mb-3" />
            <p className="text-[13px] text-zinc-500">No collaboration yet</p>
            <p className="text-[11px] text-zinc-600 mt-1 max-w-[320px] mx-auto">Create a goal, pick personas, watch them chat, debate, and build together — all in browser, no backend</p>
          </div>
        ) : (
          <>
            <div className="p-3 rounded-xl bg-[#12121a] border border-[#1e1e2e]">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-[12px] font-medium text-zinc-200">Goal: {currentSession.goal}</div>
                  <div className="text-[11px] text-zinc-500 mt-1 flex items-center gap-2">
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] border ${currentSession.status==='running' ? 'bg-amber-500/10 text-amber-300 border-amber-500/20' : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'}`}>{currentSession.status}</span>
                    <span>{currentSession.participants.length} agents • {currentSession.messages.length} messages • {new Date(currentSession.created).toLocaleTimeString()}</span>
                  </div>
                </div>
                <button onClick={() => collab.deleteSession(currentSession.id)} className="w-7 h-7 rounded-full bg-[#1a1a26] border border-[#2a2a3e] flex items-center justify-center text-zinc-500 hover:text-red-400"><X className="w-4 h-4" /></button>
              </div>
            </div>

            <div className="space-y-3">
              {currentSession.messages.map(m => {
                const persona = PERSONAS.find(p => p.id === m.agentId)
                return (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex gap-2.5"
                  >
                    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-[14px] border" style={{ background: `${persona?.color}20`, borderColor: `${persona?.color}40`, color: persona?.color }}>
                      {persona?.avatar || '🤖'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] font-medium" style={{ color: persona?.color }}>{m.agentName}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#1a1a26] border border-[#2a2a3e] text-zinc-500">{persona?.role}</span>
                        <span className="text-[10px] font-mono text-zinc-600">{new Date(m.timestamp).toLocaleTimeString()}</span>
                      </div>
                      {m.thought && (
                        <div className="mt-1 p-2 rounded-xl bg-[#12121a] border border-[#1e1e2e]/50 text-[11px] font-mono text-zinc-500 flex gap-1.5">
                          <Brain className="w-3 h-3 mt-0.5 shrink-0" /> {m.thought}
                        </div>
                      )}
                      <div className="mt-1.5 p-3 rounded-2xl rounded-tl-sm bg-[#1a1a26] border border-[#2a2a3e] text-[13px] text-zinc-200 leading-relaxed whitespace-pre-wrap">
                        {m.content}
                      </div>
                    </div>
                  </motion.div>
                )
              })}

              {currentSession.status === 'running' && (
                <div className="flex gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-[#1a1a26] border border-[#2a2a3e] flex items-center justify-center">
                    <Bot className="w-4 h-4 text-zinc-600 animate-pulse" />
                  </div>
                  <div className="p-3 rounded-2xl rounded-tl-sm bg-[#1a1a26] border border-[#2a2a3e]">
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce" />
                      <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce [animation-delay:0.1s]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce [animation-delay:0.2s]" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <div className="shrink-0 p-3 border-t border-[#1e1e2e] bg-violet-500/5">
        <h4 className="text-[11px] font-medium text-violet-300 flex items-center gap-1"><Zap className="w-3 h-3" />How multi-agent collab works (frontend)</h4>
        <ul className="mt-1 text-[11px] text-zinc-500 list-disc pl-4 space-y-0.5 leading-relaxed">
          <li><b>Personas</b>: 5 roles — Researcher, Coder, Critic, Creative, Planner — each with system prompt, color, avatar</li>
          <li><b>Collab loop</b>: Planner breaks goal → each persona responds in round-robin, 3 rounds, posts thoughts</li>
          <li><b>Mock now</b>: Simulated responses based on role keywords, real would call LLM per persona (WebLLM/BYOK)</li>
          <li><b>Future</b>: Each persona runs in Web Worker with own LLM, debates, votes, merges via CRDT</li>
        </ul>
      </div>
    </div>
  )
}
