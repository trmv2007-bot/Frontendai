import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { Brain, Eye, Pause, Sparkles } from 'lucide-react'
import type { AgentState } from '../agent/types'
import { useEnvironmentContext } from '../agent/environment/reactive'

const STATUS: Record<string, { color: string; label: string }> = {
  idle: { color: '#8b5cf6', label: 'idle' },
  thinking: { color: '#f59e0b', label: 'thinking' },
  acting: { color: '#06ffa5', label: 'working' },
  observing: { color: '#3b82f6', label: 'observing' },
  paused: { color: '#a78bfa', label: 'paused' },
  sleeping: { color: '#6b7280', label: 'sleeping' },
  error: { color: '#ef4444', label: 'attention' }
}

export function AgentOrb({ state, onClick, isOpen }: { state: AgentState; onClick: () => void; isOpen: boolean; mood?: string }) {
  const [cursor, setCursor] = useState({ x: 0, y: 0 })
  const context = useEnvironmentContext()
  const status = STATUS[state.status] ?? STATUS.idle
  const active = ['thinking', 'acting', 'observing'].includes(state.status)

  useEffect(() => {
    const onMove = (event: MouseEvent) => setCursor({ x: event.clientX, y: event.clientY })
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  return (
    <motion.button onClick={onClick} aria-label={`FrontendAI ${status.label}`} className="fixed bottom-6 right-6 z-[100] group" initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 20 }} title={`${status.label} • ${context.route}`}>
      <div className="absolute inset-0 -z-10 blur-[38px] opacity-60 group-hover:opacity-100 transition-opacity"><div className="w-[82px] h-[82px] rounded-full" style={{ background: status.color }} /></div>
      <motion.div className="relative w-16 h-16 rounded-full flex items-center justify-center select-none" style={{ background: `radial-gradient(100% 100% at 30% 20%, white 0%, ${status.color} 16%, #08080d 62%)`, boxShadow: `0 0 0 1px ${status.color}55, 0 0 30px ${status.color}55, inset 0 1px 1px rgba(255,255,255,.8)` }} animate={{ scale: isOpen ? 0.9 : [1, 1.045, 1], y: active ? [0, -3, 0] : 0 }} transition={{ scale: { duration: 2.2, repeat: isOpen ? 0 : Infinity }, y: { duration: 1.4, repeat: active ? Infinity : 0 } }} whileHover={{ scale: 1.08 }} whileTap={{ scale: .95 }}>
        <motion.div className="w-7 h-7 rounded-full bg-white" animate={{ scale: state.status === 'idle' ? [1, 1.16, 1] : active ? [1, .78, 1.25, 1] : 1, opacity: [.82, 1, .82] }} transition={{ duration: active ? .7 : 3, repeat: Infinity }} style={{ boxShadow: `0 0 18px ${status.color}, 0 0 40px ${status.color}` }} />
        {active && [0, 1, 2].map(i => <motion.span key={i} className="absolute w-1.5 h-1.5 rounded-full bg-white" style={{ boxShadow: `0 0 8px ${status.color}` }} animate={{ rotate: 360 }} transition={{ duration: 1.6 + i * .45, repeat: Infinity, ease: 'linear', delay: i * .15 }} />)}
        <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-[#050508]" style={{ background: status.color }} />
      </motion.div>
      <AnimatePresence>{!isOpen && (state.currentThought || context.activeTask) && <motion.div initial={{ opacity: 0, y: 8, scale: .94 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: .94 }} className="absolute bottom-[78px] right-0 w-[300px] rounded-2xl bg-[#11111a]/95 border border-white/10 shadow-2xl backdrop-blur-xl p-3 text-left">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-zinc-500">{active ? <Eye className="w-3 h-3" /> : state.status === 'paused' ? <Pause className="w-3 h-3" /> : <Sparkles className="w-3 h-3" />}{status.label} • {context.route}</div>
        {context.activeTask && <div className="mt-1 text-[11px] text-zinc-400 truncate">{context.activeTask.objective}</div>}
        {state.currentThought && <div className="mt-2 text-[12px] leading-relaxed text-zinc-200">{state.currentThought.slice(0, 180)}</div>}
      </motion.div>}</AnimatePresence>
      <div className="absolute -top-8 right-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 whitespace-nowrap"><span className="px-2 py-1 rounded-full bg-black/85 border border-white/10 text-[10px] uppercase tracking-widest text-white/70">{status.label}</span>{context.activeTask && <span className="px-2 py-1 rounded-full bg-violet-500/15 border border-violet-400/20 text-[10px] text-violet-200 flex items-center gap-1"><Brain className="w-3 h-3" />task</span>}</div>
      <span className="sr-only">cursor {cursor.x},{cursor.y}</span>
    </motion.button>
  )
}
