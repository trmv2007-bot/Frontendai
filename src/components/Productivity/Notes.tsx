import { useEffect, useState } from 'react'
import { db } from '../../agent/memory/db'
import type { Note } from '../../agent/types'
import { uid } from '../../lib/utils'
import { Plus, Search, Trash2, Tag } from 'lucide-react'

export function Notes() {
  const [notes, setNotes] = useState<Note[]>([])
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState<Note | null>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')

  const load = async () => {
    const all = await db.notes.orderBy('updated').reverse().toArray()
    setNotes(all)
  }
  useEffect(() => { load() }, [])

  const save = async () => {
    if (!title.trim()) return
    const now = Date.now()
    if (editing) {
      await db.notes.update(editing.id, { title, content, updated: now })
    } else {
      await db.notes.add({ id: uid(), title, content, created: now, updated: now, tags: [] })
    }
    setTitle(''); setContent(''); setEditing(null); load()
  }

  const filtered = notes.filter(n => !q || n.title.toLowerCase().includes(q.toLowerCase()) || n.content.toLowerCase().includes(q.toLowerCase()))

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="p-3 border-b border-[#1e1e2e] space-y-3">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
            <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search notes..." className="w-full h-9 pl-10 pr-3 rounded-full bg-[#1a1a26] border border-[#2a2a3e] text-[13px] focus:outline-none focus:border-violet-500/50" />
          </div>
          <button onClick={()=>{setEditing(null); setTitle(''); setContent('')}} className="h-9 px-3 rounded-full bg-white text-black text-[12px] font-medium flex items-center gap-1.5">
            <Plus className="w-4 h-4" /> New
          </button>
        </div>

        <div className="space-y-2">
          <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Note title..." className="w-full h-9 px-3 rounded-xl bg-[#1a1a26] border border-[#2a2a3e] text-[13px] focus:outline-none focus:border-violet-500/50" />
          <textarea value={content} onChange={e=>setContent(e.target.value)} placeholder="Markdown supported..." className="w-full min-h-[80px] p-3 rounded-xl bg-[#1a1a26] border border-[#2a2a3e] text-[13px] focus:outline-none focus:border-violet-500/50 resize-none" />
          <button onClick={save} className="w-full h-9 rounded-full bg-violet-600 hover:bg-violet-500 text-white text-[13px] font-medium transition-colors">
            {editing ? 'Update note' : 'Save to vault (IndexedDB)'}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {filtered.map(n => (
          <div key={n.id} className="group p-3 rounded-xl bg-[#1a1a26] border border-[#2a2a3e] hover:border-[#3a3a4e] transition-colors">
            <div className="flex items-start justify-between gap-2">
              <h4 className="font-medium text-[13px] text-zinc-100">{n.title}</h4>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={()=>{setEditing(n); setTitle(n.title); setContent(n.content)}} className="w-6 h-6 rounded-full bg-[#232334] flex items-center justify-center hover:bg-violet-500/20"><Tag className="w-3 h-3" /></button>
                <button onClick={async()=>{await db.notes.delete(n.id); load()}} className="w-6 h-6 rounded-full bg-[#232334] flex items-center justify-center hover:bg-red-500/20"><Trash2 className="w-3 h-3" /></button>
              </div>
            </div>
            <p className="text-[12px] text-zinc-400 mt-1 line-clamp-3 whitespace-pre-wrap">{n.content}</p>
            <div className="text-[10px] font-mono text-zinc-600 mt-2">{new Date(n.updated).toLocaleString()}</div>
          </div>
        ))}
        {filtered.length===0 && <div className="py-10 text-center text-[13px] text-zinc-600">No notes. Create your first knowledge atom.</div>}
      </div>
    </div>
  )
}
