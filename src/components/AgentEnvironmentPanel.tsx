import { useEffect, useState } from 'react'
import { Activity, GitBranch, Layers3 } from 'lucide-react'
import { environmentGraph, type EnvironmentSnapshot } from '../agent/environment/graph'

export function AgentEnvironmentPanel() {
  const [snapshot, setSnapshot] = useState<EnvironmentSnapshot>(() => environmentGraph.snapshot())
  useEffect(() => {
    const unsubscribe = environmentGraph.subscribe(setSnapshot)
    return () => { unsubscribe() }
  }, [])
  return <div className="flex-1 overflow-y-auto p-4 space-y-4">
    <div className="flex items-center justify-between"><div><h3 className="text-sm font-semibold">Environment</h3><p className="text-[11px] text-zinc-500 mt-1">Structured state the agent can reason about.</p></div><span className="text-[10px] font-mono text-zinc-600">rev {snapshot.revision}</span></div>
    <div className="grid grid-cols-2 gap-2"><div className="p-3 rounded-xl bg-[#12121a] border border-[#1e1e2e]"><Layers3 className="w-4 h-4 text-violet-400" /><div className="mt-2 text-lg font-semibold">{snapshot.nodes.length}</div><div className="text-[10px] text-zinc-500">nodes</div></div><div className="p-3 rounded-xl bg-[#12121a] border border-[#1e1e2e]"><GitBranch className="w-4 h-4 text-emerald-400" /><div className="mt-2 text-lg font-semibold">{snapshot.edges.length}</div><div className="text-[10px] text-zinc-500">relations</div></div></div>
    <div className="space-y-2">{snapshot.nodes.length ? snapshot.nodes.map(node => <div key={node.id} className="p-3 rounded-xl bg-[#0f0f16] border border-[#1e1e2e]"><div className="flex items-center justify-between gap-3"><span className="text-[12px] text-zinc-200 truncate">{node.label}</span><span className="text-[9px] uppercase tracking-wider text-zinc-600">{node.kind}</span></div></div>) : <div className="py-12 text-center text-zinc-600"><Activity className="w-5 h-5 mx-auto mb-2" />No environment nodes registered yet.</div>}</div>
  </div>
}
