import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'
import type { AgentState } from '../agent/types'

export function AgentOrb({ state, onClick, isOpen, mood }: { state: AgentState, onClick: () => void, isOpen: boolean, mood?: string }) {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY })
    }
    window.addEventListener('mousemove', handler)
    return () => window.removeEventListener('mousemove', handler)
  }, [])

  const statusColors: Record<string, string> = {
    idle: '#8b5cf6',
    thinking: '#f59e0b',
    acting: '#06ffa5',
    observing: '#3b82f6',
    sleeping: '#6b7280',
    error: '#ef4444'
  }

  const color = statusColors[state.status] || '#8b5cf6'

  return (
    <motion.button
      onClick={onClick}
      className="fixed bottom-6 right-6 z-[100] group"
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      style={{ 
        // @ts-ignore
        '--mouse-x': `${mousePos.x}px`,
        '--mouse-y': `${mousePos.y}px`
      } as any}
    >
      {/* glow */}
      <div className="absolute inset-0 -z-10 blur-[40px] opacity-60 group-hover:opacity-100 transition-opacity">
        <div className="w-[80px] h-[80px] rounded-full" style={{ background: color }} />
      </div>

      <motion.div
        className="relative w-[64px] h-[64px] rounded-full flex items-center justify-center cursor-pointer select-none"
        style={{
          background: `radial-gradient(100% 100% at 30% 20%, white 0%, ${color} 15%, #0a0a0f 60%)`,
          boxShadow: `0 0 0 1px ${color}40, 0 0 30px ${color}60, inset 0 1px 1px rgba(255,255,255,0.8)`
        }}
        animate={{
          scale: isOpen ? 0.9 : [1, 1.05, 1],
          rotate: state.status === 'thinking' ? 360 : 0
        }}
        transition={{
          scale: { duration: 2, repeat: isOpen ? 0 : Infinity, ease: 'easeInOut' },
          rotate: { duration: 2, repeat: state.status === 'thinking' ? Infinity : 0, ease: 'linear' }
        }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        {/* inner core */}
        <motion.div
          className="w-[28px] h-[28px] rounded-full bg-white"
          animate={{
            scale: state.status === 'idle' ? [1, 1.2, 1] : state.status === 'acting' ? [1, 0.8, 1.3, 1] : 1,
            opacity: [0.8, 1, 0.8]
          }}
          transition={{ duration: state.status === 'idle' ? 3 : 0.5, repeat: Infinity }}
          style={{ boxShadow: `0 0 20px ${color}, 0 0 40px ${color}` }}
        />

        {/* orbiting dots */}
        <AnimatePresence>
          {state.status !== 'idle' && state.status !== 'sleeping' && (
            <>
              {[0, 1, 2].map(i => (
                <motion.div
                  key={i}
                  className="absolute w-1.5 h-1.5 rounded-full bg-white"
                  initial={{ opacity: 0 }}
                  animate={{ 
                    opacity: 1,
                    rotate: 360,
                  }}
                  exit={{ opacity: 0 }}
                  transition={{
                    rotate: { duration: 2 + i, repeat: Infinity, ease: 'linear', delay: i * 0.2 }
                  }}
                  style={{
                    top: '50%',
                    left: '50%',
                    transformOrigin: `${20 + i*5}px 0`,
                    boxShadow: `0 0 10px ${color}`
                  }}
                />
              ))}
            </>
          )}
        </AnimatePresence>

        {/* status indicator */}
        <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-[#050508] flex items-center justify-center" style={{ background: color }}>
          <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
        </div>
      </motion.div>

      {/* thought bubble when thinking */}
      <AnimatePresence>
        {state.currentThought && !isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            className="absolute bottom-[80px] right-0 w-[280px] p-3 rounded-2xl rounded-br-sm bg-[#1a1a26] border border-[#2a2a3e] shadow-2xl backdrop-blur-xl"
          >
            <div className="flex gap-2 items-start">
              <div className="w-2 h-2 rounded-full mt-2 animate-pulse" style={{ background: color }} />
              <p className="text-[12px] leading-[1.4] text-zinc-300 font-mono">{state.currentThought.slice(0,120)}...</p>
            </div>
            <div className="absolute -bottom-1 right-4 w-2 h-2 bg-[#1a1a26] border-r border-b border-[#2a2a3e] rotate-45" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* label */}
      <div className="absolute -top-8 right-0 px-2 py-1 rounded-full bg-black/80 border border-white/10 text-[10px] font-medium tracking-widest uppercase text-white/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
        {mood && <span className="px-1 py-0.5 rounded-full bg-violet-500/20 text-violet-300">{mood}</span>}
        {state.status} • {state.memoryCount} memories
      </div>

      {/* sleep Zzz */}
      {mood === 'sleepy' && !isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 0 }}
          animate={{ opacity: [0,1,0], y: [-5, -20] }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
          className="absolute -top-6 -right-2 text-[14px] font-bold text-zinc-500"
        >
          Zzz
        </motion.div>
      )}
    </motion.button>
  )
}
