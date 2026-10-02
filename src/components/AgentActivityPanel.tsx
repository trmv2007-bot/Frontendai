import { useEffect, useState } from 'react'
import { Check, CircleAlert, Loader2, Pause } from 'lucide-react'
import { activityTimeline, type AgentActivity } from '../agent/core/activity'
import { taskRuntime } from '../agent/core/taskRuntime'
import { cn } from '../lib/utils'

export function AgentActivityPanel() {
  const [items, setItems] = useState<AgentActivity[]>(activityTimeline.getItems())
  const [task, setTask] = useState(taskRuntime.getTask())
  useEffect(() => {
    const a = activityTimeline.subscribe(setItems)
    const t = taskRuntime.subscribe(setTask)
    return () => { a(); t() }
  }, [])
  return <div className="flex-1 overflow-y-auto p-4 space-y-5">
    <section>
      <div className="flex items-center justify-between mb-3"><div><div className="text-[12px] uppercase tracking-widest text-zinc-500">Live activity</div><div className="text-[14px] text-zinc-200 mt-1">What the agent is doing</div></div><span className="text-[10px] font-mono text-zinc-600">{items.length} steps</span></div>
      <div className="space-y-1">
        {!items.length && <div className="rounded-2xl border border-dashed border-[#2a2a3e] p-6 text-center text-[12px] text-zinc-600">No activity yet. Start a task and execution will appear here.</div>}
        {items.map((item, index) => <div key={item.id} className="relative flex gap-3 p-3 rounded-xl hover:bg-white/[0.025]">
          {index < items.length - 1 && <span className="absolute left-[21px] top-9 bottom-[-4px] w-px bg-[#2a2a3e]" />}
          <div className={cn('relative z-10 w-4 h-4 mt-0.5 rounded-full flex items-center justify-center bg-[#0a0a0f] border', item.status === 'success' ? 'border-emerald-500/40 text-emerald-400' : item.status === 'error' ? 'border-red-500/40 text-red-400' : item.status === 'paused' ? 'border-amber-500/40 text-amber-400' : 'border-violet-500/40 text-violet-300')}>{item.status === 'success' ? <Check className="w-2.5 h-2.5" /> : item.status === 'error' ? <CircleAlert className="w-2.5 h-2.5" /> : item.status === 'paused' ? <Pause className="w-2.5 h-2.5" /> : <Loader2 className="w-2.5 h-2.5 animate-spin" />}</div>
          <div className="min-w-0 flex-1"><div className="text-[12px] text-zinc-200">{item.title}</div>{item.detail && <div className="text-[11px] text-zinc-500 mt-0.5 break-words">{item.detail}</div>}<div className="text-[9px] font-mono text-zinc-700 mt-1">{new Date(item.timestamp).toLocaleTimeString()} {item.duration !== undefined ? `• ${item.duration}ms` : ''}</div></div>
        </div>)}
      </div>
    </section>
    {task && <section className="rounded-2xl border border-[#1e1e2e] bg-[#12121a]/60 p-4"><div className="flex items-center justify-between"><div className="min-w-0"><div className="text-[10px] uppercase tracking-widest text-zinc-600">Current task</div><div className="text-[13px] text-zinc-200 mt-1 truncate">{task.objective}</div></div><span className="px-2 py-1 rounded-full bg-violet-500/10 text-violet-300 text-[9px] uppercase tracking-widest">{task.status}</span></div><div className="mt-4 space-y-2">{task.steps.map((step, index) => <div key={step.id} className="flex items-center gap-2 text-[11px]"><span className={cn('w-5 h-5 rounded-full flex items-center justify-center text-[9px] border', step.status === 'success' ? 'border-emerald-500/30 text-emerald-400' : step.status === 'error' ? 'border-red-500/30 text-red-400' : step.status === 'running' ? 'border-violet-500/30 text-violet-300' : 'border-[#2a2a3e] text-zinc-600')}>{step.status === 'success' ? '✓' : index + 1}</span><span className="truncate text-zinc-300">{step.title}</span></div>)}</div></section>}
  </div>
}
