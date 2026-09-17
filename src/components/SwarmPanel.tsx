import { useEffect, useState } from 'react'
import { getSwarm } from '../agent/p2p/swarm'
import { Share2, Users, Zap, Radio, Send, Cpu, Brain } from 'lucide-react'
import { motion } from 'framer-motion'

export function SwarmPanel() {
  const swarm = getSwarm()
  const [peers, setPeers] = useState<any[]>([])
  const [messages, setMessages] = useState<any[]>([])
  const [taskInput, setTaskInput] = useState('')
  const [stats, setStats] = useState(swarm.getStats())

  useEffect(() => {
    const unsub = swarm.subscribe((p, m) => {
      setPeers(p)
      setMessages(m)
      setStats(swarm.getStats())
    })
    return () => { unsub() }
  }, [])

  const distribute = () => {
    if (!taskInput.trim()) return
    swarm.distributeTask(taskInput.trim())
    setTaskInput('')
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="shrink-0 p-3 border-b border-[#1e1e2e] space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-fuchsia-500 to-violet-500 flex items-center justify-center">
            <Share2 className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-[13px] font-medium flex items-center gap-2">
              P2P Swarm • WebRTC + BroadcastChannel
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] border ${stats.isLeader ? 'bg-amber-500/10 text-amber-300 border-amber-500/20' : 'bg-[#1a1a26] text-zinc-500 border-[#2a2a3e]'}`}>
                {stats.isLeader ? 'Leader' : 'Follower'} • {stats.id}
              </span>
            </h3>
            <p className="text-[11px] text-zinc-500">Tabs share compute, no signaling server. Open this page in 2 tabs to see swarm.</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="p-3 rounded-xl bg-[#1a1a26] border border-[#2a2a3e] text-center">
            <div className="text-[18px] font-bold text-white">{stats.peers}</div>
            <div className="text-[10px] uppercase tracking-wide text-zinc-500">Peers</div>
          </div>
          <div className="p-3 rounded-xl bg-[#1a1a26] border border-[#2a2a3e] text-center">
            <div className="text-[18px] font-bold text-emerald-400">{stats.connected}</div>
            <div className="text-[10px] uppercase tracking-wide text-zinc-500">Connected</div>
          </div>
          <div className="p-3 rounded-xl bg-[#1a1a26] border border-[#2a2a3e] text-center">
            <div className="text-[18px] font-bold text-violet-400">{stats.messages}</div>
            <div className="text-[10px] uppercase tracking-wide text-zinc-500">Messages</div>
          </div>
        </div>

        <div className="flex gap-2">
          <input
            value={taskInput}
            onChange={e=>setTaskInput(e.target.value)}
            onKeyDown={e=>e.key==='Enter' && distribute()}
            placeholder="Distribute task to swarm, e.g. 'research frontend AI'"
            className="flex-1 h-9 px-3 rounded-full bg-[#1a1a26] border border-[#2a2a3e] text-[12px] focus:outline-none focus:border-violet-500/50"
          />
          <button onClick={distribute} className="h-9 px-4 rounded-full bg-white text-black text-[12px] font-medium flex items-center gap-1.5">
            <Send className="w-3.5 h-3.5" /> Distribute
          </button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-2 min-h-0">
        <div className="border-r border-[#1e1e2e] overflow-y-auto p-3 space-y-3">
          <h4 className="text-[11px] font-medium uppercase tracking-widest text-zinc-500 flex items-center gap-1.5"><Users className="w-3 h-3" /> Peers • {peers.length}</h4>
          {peers.length === 0 ? (
            <div className="py-10 text-center">
              <Users className="w-8 h-8 mx-auto text-zinc-700 mb-2" />
              <p className="text-[12px] text-zinc-600">No peers yet</p>
              <p className="text-[11px] text-zinc-700 mt-1">Open this site in another tab to form swarm</p>
              <button onClick={() => window.open(location.href, '_blank')} className="mt-3 px-3 py-1.5 rounded-full bg-[#1a1a26] border border-[#2a2a3e] text-[11px] text-zinc-400">Open new tab</button>
            </div>
          ) : (
            peers.map(p => (
              <div key={p.id} className="p-3 rounded-xl bg-[#1a1a26] border border-[#2a2a3e]">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-mono text-zinc-200">{p.id}</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] border ${p.status==='connected' ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' : 'bg-amber-500/10 text-amber-300 border-amber-500/20'}`}>{p.status}</span>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {p.capabilities.map((c:string) => (
                    <span key={c} className="px-1.5 py-0.5 rounded-full bg-[#232334] border border-[#2a2a3e] text-[10px] text-zinc-500">{c}</span>
                  ))}
                </div>
                <div className="text-[10px] font-mono text-zinc-600 mt-2">last seen {Math.floor((Date.now()-p.lastSeen)/1000)}s ago</div>
              </div>
            ))
          )}

          <div className="p-3 rounded-xl bg-violet-500/5 border border-violet-500/10">
            <h5 className="text-[11px] font-medium text-violet-300 flex items-center gap-1"><Cpu className="w-3 h-3" />How swarm works</h5>
            <ul className="mt-1.5 text-[11px] text-zinc-500 list-disc pl-4 space-y-0.5 leading-relaxed">
              <li><b>BroadcastChannel</b>: Local tabs discover via `frontendai_swarm` channel, no server</li>
              <li><b>WebRTC</b>: For remote peers, would use DataChannel (signaling via BC for demo)</li>
              <li><b>Leader election</b>: First tab (sorted IDs) becomes leader, distributes tasks</li>
              <li><b>Task sharing</b>: Leader broadcasts task, followers execute and return result</li>
              <li><b>Memory share</b>: Could sync IndexedDB via CRDT (future)</li>
            </ul>
          </div>
        </div>

        <div className="overflow-y-auto p-3 space-y-2">
          <h4 className="text-[11px] font-medium uppercase tracking-widest text-zinc-500 flex items-center gap-1.5"><Radio className="w-3 h-3" /> Messages • {messages.length}</h4>
          {messages.slice(0,50).map(m => (
            <div key={m.id} className="p-2.5 rounded-xl bg-[#12121a] border border-[#1e1e2e]">
              <div className="flex items-center justify-between">
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium border ${
                  m.type==='hello' ? 'bg-blue-500/10 text-blue-300 border-blue-500/20' :
                  m.type==='task' ? 'bg-amber-500/10 text-amber-300 border-amber-500/20' :
                  m.type==='result' ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' :
                  'bg-[#1a1a26] text-zinc-500 border-[#2a2a3e]'
                }`}>{m.type}</span>
                <span className="text-[10px] font-mono text-zinc-600">{m.from.slice(0,6)} • {new Date(m.timestamp).toLocaleTimeString()}</span>
              </div>
              <div className="mt-1.5 text-[11px] font-mono text-zinc-400 whitespace-pre-wrap break-words">
                {JSON.stringify(m.data, null, 2).slice(0,300)}
              </div>
            </div>
          ))}
          {messages.length===0 && <div className="py-10 text-center text-[12px] text-zinc-600">No messages yet. Tasks you distribute appear here.</div>}
        </div>
      </div>

      <div className="shrink-0 p-3 border-t border-[#1e1e2e] bg-fuchsia-500/5 flex items-center justify-between">
        <span className="text-[11px] text-zinc-500 flex items-center gap-1.5"><Zap className="w-3 h-3 text-fuchsia-400" /> P2P swarm: share embeddings, vision, python compute across tabs</span>
        <span className="text-[10px] font-mono text-zinc-600">{stats.id} {stats.isLeader ? '• leader' : '• follower'}</span>
      </div>
    </div>
  )
}
