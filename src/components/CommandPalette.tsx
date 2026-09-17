import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, MessageSquare, Brain, StickyNote, CheckSquare, Sparkles, Eye, Clock } from 'lucide-react'

const COMMANDS = [
  { id: 'read', label: 'Read this page', desc: 'Extract and summarize current page', icon: Eye, action: 'Read this page and summarize' },
  { id: 'remember', label: 'Remember something', desc: 'Store in long-term memory', icon: Brain, action: 'Remember that ' },
  { id: 'note', label: 'Create note', desc: 'Save to vault', icon: StickyNote, action: 'Create a note about ' },
  { id: 'task', label: 'Create task', desc: 'Add to todo', icon: CheckSquare, action: 'Create task: ' },
  { id: 'memory', label: 'Search memory', desc: 'Query vault', icon: Search, action: 'Search memory for ' },
  { id: 'time', label: 'What time is it?', desc: 'Get local time', icon: Clock, action: 'What time is it?' },
  { id: 'chat', label: 'Ask anything', desc: 'Chat with agent', icon: MessageSquare, action: '' },
]

export function CommandPalette({ open, onClose, onSelect }: { open: boolean, onClose: () => void, onSelect: (t: string) => void }) {
  const [q, setQ] = useState('')

  useEffect(() => {
    if (!open) setQ('')
  }, [open])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        if (open) onClose()
        else {
          // will be handled by parent to open
          const ev = new CustomEvent('frontendai:toggle-palette')
          window.dispatchEvent(ev)
        }
      }
      if (e.key === 'Escape' && open) onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  const filtered = COMMANDS.filter(c => !q || c.label.toLowerCase().includes(q.toLowerCase()) || c.desc.toLowerCase().includes(q.toLowerCase()))

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200]"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            className="fixed top-[20%] left-1/2 -translate-x-1/2 w-[min(640px,90vw)] z-[201] overflow-hidden rounded-2xl bg-[#12121a]/90 backdrop-blur-2xl border border-[#2a2a3e] shadow-[0_20px_80px_rgba(0,0,0,0.8)]"
          >
            <div className="flex items-center gap-3 px-4 h-14 border-b border-[#1e1e2e]">
              <Search className="w-5 h-5 text-zinc-500" />
              <input
                autoFocus
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder="Ask agent or run command..."
                className="flex-1 bg-transparent text-[14px] placeholder:text-zinc-600 focus:outline-none"
              />
              <span className="px-2 py-1 rounded-full bg-[#1a1a26] border border-[#2a2a3e] text-[10px] font-mono text-zinc-500">⌘K</span>
            </div>

            <div className="p-2 max-h-[320px] overflow-y-auto">
              {filtered.map(cmd => {
                const Icon = cmd.icon
                return (
                  <button
                    key={cmd.id}
                    onClick={() => { onSelect(cmd.action); onClose() }}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-[#1a1a26] text-left group transition-colors"
                  >
                    <div className="w-9 h-9 rounded-full bg-[#1a1a26] group-hover:bg-white group-hover:text-black border border-[#2a2a3e] flex items-center justify-center transition-colors">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <div className="text-[13px] font-medium text-zinc-200">{cmd.label}</div>
                      <div className="text-[11px] text-zinc-500">{cmd.desc}</div>
                    </div>
                    <div className="text-[11px] font-mono text-zinc-600 group-hover:text-zinc-400">↵</div>
                  </button>
                )
              })}
              {filtered.length===0 && (
                <div className="py-10 text-center">
                  <Sparkles className="w-6 h-6 mx-auto text-zinc-600 mb-2" />
                  <p className="text-[13px] text-zinc-500">No commands. Press Enter to send "{q}" as chat.</p>
                  <button
                    onClick={() => { onSelect(q); onClose() }}
                    className="mt-3 px-4 py-2 rounded-full bg-white text-black text-[12px] font-medium"
                  >
                    Send to agent
                  </button>
                </div>
              )}
            </div>

            <div className="px-4 py-2 border-t border-[#1e1e2e] flex items-center justify-between text-[10px] font-mono text-zinc-600">
              <span>FrontendAI • 100% frontend • {filtered.length} commands</span>
              <span className="flex items-center gap-2"><span>↑↓ navigate</span><span>↵ select</span><span>esc close</span></span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
