import { useEffect, useState } from 'react'
import { getCRDT } from '../agent/sync/crdtSync'
import { Database, Share2, Zap, RefreshCw, Users } from 'lucide-react'
import { db } from '../agent/memory/db'

export function CRDTPanel() {
  const crdt = getCRDT()
  const [stats, setStats] = useState(crdt.getStats())
  const [idbStats, setIdbStats] = useState({ memories: 0, notes: 0, tasks: 0 })

  useEffect(() => {
    const unsub = crdt.subscribe(() => {
      setStats(crdt.getStats())
      loadIDB()
    })
    loadIDB()
    return () => { unsub() }
  }, [])

  const loadIDB = async () => {
    const mems = await db.memories.count()
    const notes = await db.notes.count()
    const tasks = await db.tasks.count()
    setIdbStats({ memories: mems, notes: notes, tasks: tasks })
  }

  const addTestMemory = async () => {
    const id = Math.random().toString(36).slice(2,9)
    const mem = {
      id,
      type: 'fact' as const,
      content: `CRDT test memory ${id} from tab ${crdt.getStats().id} at ${new Date().toLocaleTimeString()}`,
      timestamp: Date.now(),
      importance: 5,
      tags: ['crdt', 'test']
    }
    crdt.addMemory(mem)
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
          <Share2 className="w-4 h-4 text-white" />
        </div>
        <div>
          <h3 className="text-[13px] font-medium">CRDT Sync • Yjs + BroadcastChannel • Multi-tab Memory Sync</h3>
          <p className="text-[11px] text-zinc-500">Sync memories/notes/tasks across tabs in real-time, no server, CRDT merge</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="p-3 rounded-xl bg-[#1a1a26] border border-[#2a2a3e]">
          <div className="text-[11px] uppercase tracking-wide text-zinc-500">This tab ID</div>
          <div className="text-[13px] font-mono text-white mt-1">{stats.id}</div>
          <div className="text-[10px] text-zinc-600 mt-1">Yjs Doc • BroadcastChannel: frontendai_crdt</div>
        </div>
        <div className="p-3 rounded-xl bg-[#1a1a26] border border-[#2a2a3e]">
          <div className="text-[11px] uppercase tracking-wide text-zinc-500">CRDT State</div>
          <div className="text-[12px] text-zinc-300 mt-1 font-mono">mem {stats.memories} • notes {stats.notes} • tasks {stats.tasks}</div>
          <div className="text-[10px] text-zinc-600 mt-1">Y.Map sizes • auto-merged</div>
        </div>
        <div className="p-3 rounded-xl bg-[#1a1a26] border border-[#2a2a3e]">
          <div className="text-[11px] uppercase tracking-wide text-zinc-500">IndexedDB (local)</div>
          <div className="text-[12px] text-zinc-300 mt-1 font-mono">mem {idbStats.memories} • notes {idbStats.notes} • tasks {idbStats.tasks}</div>
          <div className="text-[10px] text-zinc-600 mt-1">Dexie • synced from CRDT</div>
        </div>
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
          <div className="text-[11px] uppercase tracking-wide text-emerald-300">Sync</div>
          <div className="text-[12px] text-emerald-200 mt-1">Real-time via BroadcastChannel</div>
          <div className="text-[10px] text-emerald-400/60 mt-1">Open 2 tabs to see sync</div>
        </div>
      </div>

      <div className="flex gap-2">
        <button onClick={addTestMemory} className="h-9 px-4 rounded-full bg-white text-black text-[12px] font-medium flex items-center gap-1.5">
          <Database className="w-4 h-4" /> Add test memory (CRDT)
        </button>
        <button onClick={loadIDB} className="h-9 px-3 rounded-full bg-[#1a1a26] border border-[#2a2a3e] text-[12px] flex items-center gap-1.5">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
        <button onClick={() => window.open(location.href, '_blank')} className="h-9 px-3 rounded-full bg-[#1a1a26] border border-[#2a2a3e] text-[12px] flex items-center gap-1.5">
          <Users className="w-4 h-4" /> Open new tab (test sync)
        </button>
      </div>

      <div className="p-3 rounded-xl bg-violet-500/5 border border-violet-500/10">
        <h4 className="text-[11px] font-medium text-violet-300 flex items-center gap-1.5"><Zap className="w-3 h-3" />How CRDT sync works (frontend)</h4>
        <ul className="mt-1.5 text-[11px] text-zinc-500 leading-relaxed list-disc pl-4 space-y-0.5">
          <li><b>Yjs</b>: CRDT library, Y.Doc with Y.Map for memories/notes/tasks, handles merge automatically</li>
          <li><b>BroadcastChannel</b>: `frontendai_crdt` channel, tabs broadcast Yjs updates (Uint8Array), no server</li>
          <li><b>Sync flow</b>: IDB → Yjs on start, Yjs update → broadcast → other tabs apply → sync to IDB</li>
          <li><b>Conflict resolution</b>: Last-write-wins via timestamp, Yjs handles concurrent edits via CRDT</li>
          <li><b>Test</b>: Open 2 tabs, add memory in one, see it appear in other tab's vault in real-time</li>
          <li><b>Future</b>: Use y-webrtc for remote peers, y-indexeddb for persistence</li>
        </ul>
      </div>

      <div className="p-3 rounded-xl bg-[#1a1a26] border border-[#2a2a3e]">
        <h4 className="text-[12px] font-medium text-zinc-300">Try it</h4>
        <ol className="mt-2 text-[11px] text-zinc-500 list-decimal pl-4 space-y-1 leading-relaxed">
          <li>Open this site in 2 tabs (button above)</li>
          <li>In Tab A, go to CRDT panel → Add test memory</li>
          <li>In Tab B, check Vault or CRDT panel → memory appears via CRDT sync, no reload needed</li>
          <li>Add note in Tab B → appears in Tab A</li>
          <li>All 100% frontend, no backend, via BroadcastChannel + Yjs</li>
        </ol>
      </div>
    </div>
  )
}
