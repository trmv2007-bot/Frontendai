import { useEffect, useState } from 'react'
import { CheckCircle2, CircleAlert, History, Loader2 } from 'lucide-react'
import { taskReplay, type ReplayEvent } from '../agent/core/replay'
import { taskRuntime } from '../agent/core/taskRuntime'

export function AgentReplayPanel() {
  const [events, setEvents] = useState<ReplayEvent[]>([])
  useEffect(() => {
    const refresh = () => { const task = taskRuntime.getTask(); setEvents(task ? taskReplay.list(task.id) : []) }
    const unsubscribe = taskRuntime.subscribe(refresh)
    refresh()
    return () => { unsubscribe() }
  }, [])
  return <div className="flex-1 overflow-y-auto p-4 space-y-4">
    <div><h3 className="text-sm font-semibold flex items-center gap-2"><History className="w-4 h-4 text-violet-400" />Task Replay</h3><p className="text-[11px] text-zinc-500 mt-1">A chronological record of agent decisions, actions and verification.</p></div>
    <div className="space-y-2">{events.length ? events.map(event => <div key={event.id} className="flex gap-3 p-3 rounded-xl bg-[#0f0f16] border border-[#1e1e2e]"><div className="pt-0.5">{event.kind === 'error' ? <CircleAlert className="w-4 h-4 text-amber-400" /> : event.kind === 'task' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Loader2 className="w-4 h-4 text-violet-400" />}</div><div className="min-w-0 flex-1"><div className="text-[12px] text-zinc-200">{event.label}</div>{event.detail && <div className="text-[10px] text-zinc-500 mt-1 break-words">{event.detail}</div>}<div className="text-[9px] text-zinc-700 font-mono mt-1">{new Date(event.timestamp).toLocaleTimeString()}</div></div></div>) : <div className="py-12 text-center text-zinc-600">Start a task to create a replay timeline.</div>}</div>
  </div>
}
