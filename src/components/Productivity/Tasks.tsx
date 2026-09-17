import { useEffect, useState } from 'react'
import { db } from '../../agent/memory/db'
import type { Task } from '../../agent/types'
import { uid } from '../../lib/utils'
import { Plus, Check, Trash2, Clock, Flag } from 'lucide-react'
import { cn } from '../../lib/utils'

export function Tasks() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [title, setTitle] = useState('')
  const [filter, setFilter] = useState<'all'|'active'|'done'>('all')

  const load = async () => {
    const all = await db.tasks.orderBy('created').reverse().toArray()
    setTasks(all)
  }
  useEffect(() => { load() }, [])

  const add = async () => {
    if (!title.trim()) return
    await db.tasks.add({ id: uid(), title: title.trim(), completed: false, created: Date.now(), priority: 'med' })
    setTitle(''); load()
  }

  const toggle = async (t: Task) => {
    await db.tasks.update(t.id, { completed: !t.completed })
    load()
  }

  const filtered = tasks.filter(t => filter==='all' ? true : filter==='active' ? !t.completed : t.completed)

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="p-3 border-b border-[#1e1e2e] space-y-3">
        <div className="flex gap-2">
          <input
            value={title}
            onChange={e=>setTitle(e.target.value)}
            onKeyDown={e=>e.key==='Enter' && add()}
            placeholder="Add a task, e.g. 'research frontend AI'"
            className="flex-1 h-10 px-4 rounded-full bg-[#1a1a26] border border-[#2a2a3e] text-[13px] focus:outline-none focus:border-violet-500/50"
          />
          <button onClick={add} className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center hover:bg-zinc-200">
            <Plus className="w-5 h-5" />
          </button>
        </div>
        <div className="flex gap-1.5">
          {(['all','active','done'] as const).map(f => (
            <button
              key={f}
              onClick={()=>setFilter(f)}
              className={cn(
                "px-3 py-1.5 rounded-full text-[11px] font-medium border capitalize",
                filter===f ? "bg-white text-black border-white" : "bg-[#1a1a26] text-zinc-500 border-[#2a2a3e] hover:text-zinc-300"
              )}
            >
              {f} ({f==='all'?tasks.length:f==='active'?tasks.filter(t=>!t.completed).length:tasks.filter(t=>t.completed).length})
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {filtered.map(t => (
          <div key={t.id} className={cn("group flex items-center gap-3 p-3 rounded-xl border transition-colors", t.completed ? "bg-[#12121a] border-[#1e1e2e] opacity-60" : "bg-[#1a1a26] border-[#2a2a3e] hover:border-[#3a3a4e]")}>
            <button
              onClick={()=>toggle(t)}
              className={cn("w-6 h-6 rounded-full border flex items-center justify-center shrink-0 transition-colors", t.completed ? "bg-emerald-500 border-emerald-500 text-white" : "border-[#3a3a4e] hover:border-violet-500/50 hover:bg-violet-500/10")}
            >
              {t.completed && <Check className="w-4 h-4" />}
            </button>
            <div className="flex-1 min-w-0">
              <div className={cn("text-[13px]", t.completed ? "line-through text-zinc-500" : "text-zinc-200")}>{t.title}</div>
              <div className="flex items-center gap-2 mt-1">
                <span className="flex items-center gap-1 text-[10px] text-zinc-600 font-mono"><Clock className="w-3 h-3" />{new Date(t.created).toLocaleDateString()}</span>
                <span className={cn("px-1.5 py-0.5 rounded-full text-[10px] font-medium border flex items-center gap-1", t.priority==='high' ? "bg-red-500/10 text-red-300 border-red-500/20" : t.priority==='med' ? "bg-amber-500/10 text-amber-300 border-amber-500/20" : "bg-[#232334] text-zinc-500 border-[#2a2a3e]")}><Flag className="w-3 h-3" />{t.priority}</span>
              </div>
            </div>
            <button onClick={async()=>{await db.tasks.delete(t.id); load()}} className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-full bg-[#232334] hover:bg-red-500/20 flex items-center justify-center transition-all">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        {filtered.length===0 && <div className="py-16 text-center"><div className="text-[13px] text-zinc-600">No {filter} tasks</div><div className="text-[11px] text-zinc-700 mt-1 font-mono">All stored locally, no sync</div></div>}
      </div>
    </div>
  )
}
