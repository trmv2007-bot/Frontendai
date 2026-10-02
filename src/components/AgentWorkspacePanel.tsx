import { useEffect, useState } from 'react'
import { LayoutDashboard, Plus, X } from 'lucide-react'
import { taskRuntime } from '../agent/core/taskRuntime'
import { taskWorkspaces, type TaskWorkspace } from '../agent/workspaces/taskWorkspace'

export function AgentWorkspacePanel() {
  const [workspaces, setWorkspaces] = useState<TaskWorkspace[]>([])
  useEffect(() => {
    const refresh = () => { const task = taskRuntime.getTask(); setWorkspaces(task ? taskWorkspaces.forTask(task.id) : []) }
    const unsubscribe = taskRuntime.subscribe(refresh)
    refresh()
    return () => { unsubscribe() }
  }, [])
  const createWorkspace = () => {
    const task = taskRuntime.getTask()
    if (!task) return
    const workspace = taskWorkspaces.create(task.id, 'custom', 'Agent workspace', [{ title: 'Task context', component: 'task-context', data: { objective: task.objective } }])
    setWorkspaces(taskWorkspaces.forTask(task.id))
    return workspace
  }
  return <div className="flex-1 overflow-y-auto p-4 space-y-4">
    <div className="flex items-center justify-between"><div><h3 className="text-sm font-semibold flex items-center gap-2"><LayoutDashboard className="w-4 h-4 text-violet-400" />Task Workspaces</h3><p className="text-[11px] text-zinc-500 mt-1">Temporary interfaces assembled around the active task.</p></div><button onClick={createWorkspace} className="w-8 h-8 rounded-lg bg-white text-black flex items-center justify-center"><Plus className="w-4 h-4" /></button></div>
    {!workspaces.length ? <div className="py-12 text-center text-zinc-600">No task workspace is active.</div> : <div className="space-y-3">{workspaces.map(workspace => <div key={workspace.id} className="rounded-xl bg-[#0f0f16] border border-[#1e1e2e] overflow-hidden"><div className="p-3 flex items-center justify-between"><div><div className="text-[12px] text-zinc-200">{workspace.title}</div><div className="text-[9px] uppercase tracking-wider text-zinc-600 mt-1">{workspace.kind}</div></div><button onClick={() => { taskWorkspaces.remove(workspace.id); setWorkspaces(taskWorkspaces.forTask(workspace.taskId)) }} className="text-zinc-600 hover:text-zinc-300"><X className="w-3.5 h-3.5" /></button></div><div className="px-3 pb-3 space-y-1">{workspace.panels.map(panel => <div key={panel.id} className="px-2.5 py-2 rounded-lg bg-[#151520] text-[10px] text-zinc-500">{panel.title}</div>)}</div></div>)}</div>}
  </div>
}
