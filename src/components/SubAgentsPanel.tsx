import { useState, useRef } from 'react'
import { Bot, Play, X, Zap, Brain, Wrench } from 'lucide-react'
import { motion } from 'framer-motion'

type SubAgent = {
  id: string
  goal: string
  status: 'running' | 'done' | 'error'
  thoughts: string[]
  tools: any[]
  result?: string
  worker?: Worker
}

export function SubAgentsPanel() {
  const [agents, setAgents] = useState<SubAgent[]>([])
  const [goalInput, setGoalInput] = useState('')

  const spawn = (goal: string) => {
    if (!goal.trim()) return
    const id = Math.random().toString(36).slice(2,9)
    
    const worker = new Worker(new URL('../workers/agentWorker.ts', import.meta.url), { type: 'module' })
    
    const newAgent: SubAgent = {
      id,
      goal,
      status: 'running',
      thoughts: [],
      tools: [],
      worker
    }

    setAgents(prev => [newAgent, ...prev])

    worker.onmessage = (e) => {
      const msg = e.data
      setAgents(prev => prev.map(a => {
        if (a.id !== msg.id) return a
        if (msg.type === 'thought') {
          return { ...a, thoughts: [...a.thoughts, msg.data.thought] }
        }
        if (msg.type === 'tool') {
          return { ...a, tools: [...a.tools, msg.data] }
        }
        if (msg.type === 'result') {
          worker.terminate()
          return { ...a, status: 'done', result: msg.data.summary }
        }
        if (msg.type === 'error') {
          worker.terminate()
          return { ...a, status: 'error', result: msg.data.error }
        }
        return a
      }))
    }

    worker.postMessage({ id, type: 'run', goal, context: `Main thread has ${agents.length} agents running` })
  }

  const kill = (id: string) => {
    const agent = agents.find(a => a.id === id)
    try { agent?.worker?.terminate() } catch {}
    setAgents(prev => prev.filter(a => a.id !== id))
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="shrink-0 p-3 border-b border-[#1e1e2e] space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-[13px] font-medium">Sub-Agents • Web Workers • Parallel</h3>
            <p className="text-[11px] text-zinc-500">Spawn agents in workers, 100% frontend, parallel ReAct loops</p>
          </div>
        </div>

        <div className="flex gap-2">
          <input
            value={goalInput}
            onChange={e=>setGoalInput(e.target.value)}
            onKeyDown={e=>e.key==='Enter' && (spawn(goalInput), setGoalInput(''))}
            placeholder="Goal for sub-agent, e.g. 'research frontend AI trends'"
            className="flex-1 h-9 px-3 rounded-full bg-[#1a1a26] border border-[#2a2a3e] text-[12px] focus:outline-none focus:border-violet-500/50"
          />
          <button
            onClick={() => { spawn(goalInput); setGoalInput('') }}
            className="h-9 px-4 rounded-full bg-white text-black text-[12px] font-medium flex items-center gap-1.5"
          >
            <Play className="w-3.5 h-3.5" /> Spawn
          </button>
        </div>

        <div className="flex gap-1.5">
          {['research frontend AI', 'create note about agents', 'calculate fibonacci', 'draw diagram'].map(s => (
            <button key={s} onClick={() => spawn(s)} className="px-2.5 py-1 rounded-full bg-[#1a1a26] border border-[#2a2a3e] text-[11px] text-zinc-500 hover:text-zinc-300">
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {agents.length === 0 ? (
          <div className="py-16 text-center">
            <Bot className="w-10 h-10 mx-auto text-zinc-700 mb-3" />
            <p className="text-[13px] text-zinc-500">No sub-agents running</p>
            <p className="text-[11px] text-zinc-600 mt-1">Spawn one — it runs in a Web Worker, parallel to main thread</p>
          </div>
        ) : (
          agents.map(agent => (
            <motion.div
              key={agent.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 rounded-xl bg-[#1a1a26] border border-[#2a2a3e]"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-mono font-medium text-zinc-200">{agent.id}</span>
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] border ${
                      agent.status==='running' ? 'bg-amber-500/10 text-amber-300 border-amber-500/20 animate-pulse' :
                      agent.status==='done' ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' :
                      'bg-red-500/10 text-red-300 border-red-500/20'
                    }`}>{agent.status}</span>
                    <span className="text-[11px] text-zinc-500 truncate flex-1">{agent.goal.slice(0,50)}</span>
                  </div>
                  
                  {agent.thoughts.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {agent.thoughts.map((th, i) => (
                        <div key={i} className="flex gap-1.5 text-[11px] font-mono text-zinc-500">
                          <Brain className="w-3 h-3 mt-0.5 shrink-0" /> {th}
                        </div>
                      ))}
                    </div>
                  )}

                  {agent.tools.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {agent.tools.map((t, i) => (
                        <span key={i} className="px-2 py-0.5 rounded-full bg-[#232334] border border-[#2a2a3e] text-[10px] font-mono text-zinc-400 flex items-center gap-1">
                          <Wrench className="w-3 h-3" />{t.name} {t.status}
                        </span>
                      ))}
                    </div>
                  )}

                  {agent.result && (
                    <div className="mt-3 p-2.5 rounded-xl bg-[#12121a] border border-[#1e1e2e] text-[12px] text-zinc-300 whitespace-pre-wrap leading-relaxed">
                      {agent.result}
                    </div>
                  )}
                </div>

                <button onClick={() => kill(agent.id)} className="w-7 h-7 rounded-full bg-[#232334] hover:bg-red-500/20 flex items-center justify-center text-zinc-500 hover:text-red-400">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>

      <div className="shrink-0 p-3 border-t border-[#1e1e2e] bg-violet-500/5">
        <h4 className="text-[11px] font-medium text-violet-300 flex items-center gap-1"><Zap className="w-3 h-3" />How sub-agents work (frontend)</h4>
        <ul className="mt-1 text-[11px] text-zinc-500 list-disc pl-4 space-y-0.5 leading-relaxed">
          <li><b>Web Worker</b>: Each sub-agent runs in separate thread via `new Worker()`, no main thread block</li>
          <li><b>ReAct in worker</b>: Worker simulates thought → tool → result loop, posts messages to main</li>
          <li><b>Parallel</b>: Spawn 5 agents, they all run concurrently, 100% local</li>
          <li><b>Future</b>: Real impl would run full LLM in worker via WebLLM, shared via Comlink</li>
        </ul>
      </div>
    </div>
  )
}
