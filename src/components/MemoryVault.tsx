import { useEffect, useState } from 'react'
import { db } from '../agent/memory/db'
import type { MemoryItem, Note } from '../agent/types'
import { Brain, Search, Trash2, Tag, Sparkles } from 'lucide-react'

export function MemoryVault() {
  const [memories, setMemories] = useState<MemoryItem[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [q, setQ] = useState('')

  const load = async () => {
    const mems = await db.memories.orderBy('timestamp').reverse().toArray()
    const n = await db.notes.orderBy('updated').reverse().toArray()
    setMemories(mems)
    setNotes(n)
  }

  useEffect(() => { load() }, [])

  const filteredMems = memories.filter(m => !q || m.content.toLowerCase().includes(q.toLowerCase()) || m.tags.join(' ').toLowerCase().includes(q.toLowerCase()))
  const filteredNotes = notes.filter(n => !q || n.title.toLowerCase().includes(q.toLowerCase()) || n.content.toLowerCase().includes(q.toLowerCase()))

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      <div className="flex items-center gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search memories & notes..."
            className="w-full h-10 pl-10 pr-4 rounded-full bg-[#1a1a26] border border-[#2a2a3e] focus:border-violet-500/50 focus:outline-none text-[13px]"
          />
        </div>
        <span className="text-[11px] font-mono text-zinc-500 px-2 py-1 rounded-full bg-[#1a1a26] border border-[#2a2a3e]">{memories.length} mems</span>
      </div>

      <div>
        <h3 className="text-[12px] font-medium uppercase tracking-widest text-zinc-400 flex items-center gap-2 mb-3">
          <Brain className="w-4 h-4" /> Long-term Memories • Vector Indexed
        </h3>
        <div className="space-y-2">
          {filteredMems.length === 0 ? (
            <div className="p-6 rounded-xl bg-[#1a1a26] border border-[#2a2a3e] text-center">
              <Sparkles className="w-6 h-6 mx-auto text-zinc-600 mb-2" />
              <p className="text-[13px] text-zinc-500">No memories yet. Tell me "remember my name is..."</p>
              <p className="text-[11px] text-zinc-600 mt-1 font-mono">Stored in IndexedDB with pseudo-embeddings (real would use transformers.js)</p>
            </div>
          ) : filteredMems.map(m => (
            <div key={m.id} className="p-3 rounded-xl bg-[#1a1a26] border border-[#2a2a3e] group hover:border-violet-500/30 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <p className="text-[13px] text-zinc-200 leading-relaxed flex-1">{m.content}</p>
                <button
                  onClick={async () => { await db.memories.delete(m.id); load() }}
                  className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-full bg-[#232334] hover:bg-red-500/20 flex items-center justify-center transition-all"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium border ${
                  m.importance >= 7 ? 'bg-amber-500/10 text-amber-300 border-amber-500/20' :
                  'bg-[#232334] text-zinc-500 border-[#2a2a3e]'
                }`}>imp {m.importance}</span>
                <span className="text-[10px] text-zinc-600 font-mono">{new Date(m.timestamp).toLocaleString()}</span>
                <span className="flex items-center gap-1 text-[10px] text-zinc-500"><Tag className="w-3 h-3" />{m.tags.join(', ') || 'no tags'}</span>
                <span className="ml-auto text-[10px] font-mono text-zinc-600">{m.type}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-[12px] font-medium uppercase tracking-widest text-zinc-400 flex items-center gap-2 mb-3">
          <span className="w-4 h-4 rounded-full bg-emerald-500/20 flex items-center justify-center">📝</span> Notes Vault
        </h3>
        <div className="grid gap-2">
          {filteredNotes.length === 0 ? (
            <div className="p-4 rounded-xl bg-[#1a1a26] border border-[#2a2a3e] text-center text-[12px] text-zinc-500">No notes yet. Say "create note about..."</div>
          ) : filteredNotes.map(n => (
            <div key={n.id} className="p-3 rounded-xl bg-[#1a1a26] border border-[#2a2a3e]">
              <div className="font-medium text-[13px] text-zinc-200">{n.title}</div>
              <div className="text-[12px] text-zinc-400 mt-1 whitespace-pre-wrap">{n.content.slice(0,300)}</div>
              <div className="flex items-center gap-2 mt-2 text-[10px] text-zinc-600 font-mono">
                <span>{new Date(n.updated).toLocaleString()}</span>
                <span>• {n.tags.join(', ')}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="p-3 rounded-xl bg-violet-500/5 border border-violet-500/10">
        <h4 className="text-[11px] font-medium text-violet-300">How memory works (100% frontend)</h4>
        <ul className="mt-1.5 text-[11px] text-zinc-500 leading-relaxed list-disc pl-4 space-y-0.5">
          <li>IndexedDB (Dexie) for persistence, survives reloads</li>
          <li>Vector embeddings via transformers.js (pseudo for now, swap to real)</li>
          <li>Cosine similarity search in browser</li>
          <li>Importance scoring + recency for retrieval</li>
          <li>Export/import brain in settings</li>
        </ul>
      </div>
    </div>
  )
}
