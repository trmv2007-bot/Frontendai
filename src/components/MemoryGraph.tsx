import { useEffect, useRef, useState, useMemo } from 'react'
import { db } from '../agent/memory/db'
import { cosineSimilarity } from '../agent/memory/embeddings'
import { Brain, Zap, Share2 } from 'lucide-react'
import { motion } from 'framer-motion'

type Node = {
  id: string
  label: string
  type: 'memory' | 'note'
  x: number
  y: number
  vx: number
  vy: number
  importance: number
  tags: string[]
  content: string
}

type Edge = {
  source: string
  target: string
  strength: number
}

export function MemoryGraph() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [nodes, setNodes] = useState<Node[]>([])
  const [edges, setEdges] = useState<Edge[]>([])
  const [selected, setSelected] = useState<Node | null>(null)
  const [hovered, setHovered] = useState<string | null>(null)
  const animationRef = useRef<number>(0)

  const load = async () => {
    const mems = await db.memories.toArray()
    const notes = await db.notes.toArray()
    const all = [
      ...mems.map(m => ({ id: m.id, label: m.content.slice(0,30), type: 'memory' as const, content: m.content, importance: m.importance, tags: m.tags, embedding: m.embedding })),
      ...notes.map(n => ({ id: n.id, label: n.title.slice(0,30), type: 'note' as const, content: n.content, importance: 5, tags: n.tags, embedding: undefined as any }))
    ]

    // Create nodes with random positions
    const newNodes: Node[] = all.map((item) => ({
      id: item.id,
      label: item.label,
      type: item.type,
      x: Math.random() * 600 + 100,
      y: Math.random() * 400 + 100,
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 2,
      importance: item.importance,
      tags: item.tags,
      content: item.content
    }))

    // Create edges based on embedding similarity or tag overlap
    const newEdges: Edge[] = []
    for (let i = 0; i < all.length; i++) {
      for (let j = i + 1; j < all.length; j++) {
        const a = all[i], b = all[j]
        let strength = 0
        
        // Tag overlap
        const tagOverlap = a.tags.filter(t => b.tags.includes(t)).length
        if (tagOverlap > 0) strength += tagOverlap * 0.3

        // Embedding similarity if both have embeddings of same dim
        if (a.embedding && b.embedding && a.embedding.length === b.embedding.length) {
          const sim = cosineSimilarity(a.embedding, b.embedding)
          if (sim > 0.6) strength += sim
        } else {
          // Fallback: text overlap
          const wordsA = new Set(a.content.toLowerCase().split(/\W+/))
          const wordsB = new Set(b.content.toLowerCase().split(/\W+/))
          let common = 0
          wordsA.forEach(w => { if (w.length > 3 && wordsB.has(w)) common++ })
          if (common > 2) strength += common * 0.1
        }

        if (strength > 0.4) {
          newEdges.push({ source: a.id, target: b.id, strength: Math.min(strength, 1) })
        }
      }
    }

    setNodes(newNodes)
    setEdges(newEdges)
  }

  useEffect(() => { load() }, [])

  // Physics simulation + render
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || nodes.length === 0) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = canvas.width
    const height = canvas.height

    const render = () => {
      ctx.clearRect(0, 0, width, height)

      // Update physics
      setNodes(prev => {
        const next = prev.map(n => ({ ...n }))
        
        // Repulsion between nodes
        for (let i = 0; i < next.length; i++) {
          for (let j = i + 1; j < next.length; j++) {
            const a = next[i], b = next[j]
            const dx = a.x - b.x
            const dy = a.y - b.y
            const dist = Math.sqrt(dx*dx + dy*dy) || 1
            if (dist < 200) {
              const force = (200 - dist) * 0.01
              const fx = (dx / dist) * force
              const fy = (dy / dist) * force
              a.vx += fx
              a.vy += fy
              b.vx -= fx
              b.vy -= fy
            }
          }
        }

        // Attraction along edges
        edges.forEach(e => {
          const a = next.find(n => n.id === e.source)
          const b = next.find(n => n.id === e.target)
          if (!a || !b) return
          const dx = b.x - a.x
          const dy = b.y - a.y
          const dist = Math.sqrt(dx*dx + dy*dy) || 1
          const force = dist * 0.001 * e.strength
          const fx = (dx / dist) * force
          const fy = (dy / dist) * force
          a.vx += fx
          a.vy += fy
          b.vx -= fx
          b.vy -= fy
        })

        // Update positions with damping
        next.forEach(n => {
          if (selected?.id === n.id) return // don't move selected
          n.vx *= 0.95
          n.vy *= 0.95
          n.x += n.vx
          n.y += n.vy
          
          // Bounds
          if (n.x < 30) { n.x = 30; n.vx *= -0.5 }
          if (n.x > width - 30) { n.x = width - 30; n.vx *= -0.5 }
          if (n.y < 30) { n.y = 30; n.vy *= -0.5 }
          if (n.y > height - 30) { n.y = height - 30; n.vy *= -0.5 }
        })

        return next
      })

      // Draw edges
      edges.forEach(e => {
        const a = nodes.find(n => n.id === e.source)
        const b = nodes.find(n => n.id === e.target)
        if (!a || !b) return
        
        const isHighlighted = hovered === e.source || hovered === e.target || selected?.id === e.source || selected?.id === e.target
        
        ctx.beginPath()
        ctx.moveTo(a.x, a.y)
        ctx.lineTo(b.x, b.y)
        ctx.strokeStyle = isHighlighted ? `rgba(139,92,246,${0.3 + e.strength*0.5})` : `rgba(255,255,255,${0.05 + e.strength*0.1})`
        ctx.lineWidth = isHighlighted ? 1.5 + e.strength*2 : 0.5 + e.strength
        ctx.stroke()
      })

      // Draw nodes
      nodes.forEach(n => {
        const isSelected = selected?.id === n.id
        const isHovered = hovered === n.id
        const radius = 6 + n.importance * 1.2 + (isSelected || isHovered ? 4 : 0)
        
        // Glow
        if (isSelected || isHovered) {
          const gradient = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, radius*3)
          gradient.addColorStop(0, n.type === 'memory' ? 'rgba(139,92,246,0.4)' : 'rgba(6,255,165,0.4)')
          gradient.addColorStop(1, 'transparent')
          ctx.fillStyle = gradient
          ctx.beginPath()
          ctx.arc(n.x, n.y, radius*3, 0, Math.PI*2)
          ctx.fill()
        }

        // Node
        ctx.beginPath()
        ctx.arc(n.x, n.y, radius, 0, Math.PI*2)
        ctx.fillStyle = n.type === 'memory' 
          ? (isSelected ? '#8b5cf6' : isHovered ? '#a78bfa' : '#6d28d9')
          : (isSelected ? '#06ffa5' : isHovered ? '#34d399' : '#059669')
        ctx.fill()
        
        ctx.strokeStyle = isSelected ? 'white' : 'rgba(255,255,255,0.2)'
        ctx.lineWidth = isSelected ? 2 : 1
        ctx.stroke()

        // Label
        if (isSelected || isHovered || n.importance > 6) {
          ctx.fillStyle = 'rgba(255,255,255,0.9)'
          ctx.font = `${isSelected ? '12px' : '10px'} monospace`
          ctx.fillText(n.label.slice(0, isSelected ? 40 : 20), n.x + radius + 6, n.y + 3)
        }
      })

      animationRef.current = requestAnimationFrame(render)
    }

    render()
    return () => cancelAnimationFrame(animationRef.current)
  }, [nodes, edges, selected, hovered])

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = (e.clientX - rect.left) * (canvas.width / rect.width)
    const y = (e.clientY - rect.top) * (canvas.height / rect.height)

    const clicked = nodes.find(n => {
      const dx = n.x - x
      const dy = n.y - y
      return Math.sqrt(dx*dx + dy*dy) < 15
    })

    setSelected(clicked || null)
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = (e.clientX - rect.left) * (canvas.width / rect.width)
    const y = (e.clientY - rect.top) * (canvas.height / rect.height)

    const hoveredNode = nodes.find(n => {
      const dx = n.x - x
      const dy = n.y - y
      return Math.sqrt(dx*dx + dy*dy) < 15
    })
    setHovered(hoveredNode?.id || null)
    canvas.style.cursor = hoveredNode ? 'pointer' : 'grab'
  }

  const stats = useMemo(() => ({
    memories: nodes.filter(n => n.type === 'memory').length,
    notes: nodes.filter(n => n.type === 'note').length,
    connections: edges.length,
    avgImportance: nodes.length ? (nodes.reduce((s,n)=>s+n.importance,0)/nodes.length).toFixed(1) : '0'
  }), [nodes, edges])

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="p-3 border-b border-[#1e1e2e] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Share2 className="w-4 h-4 text-violet-400" />
          <span className="text-[12px] font-medium uppercase tracking-widest text-zinc-400">Memory Graph • {nodes.length} nodes • {edges.length} links</span>
        </div>
        <button onClick={load} className="px-3 py-1 rounded-full bg-[#1a1a26] border border-[#2a2a3e] text-[11px] text-zinc-400 hover:text-white">Refresh</button>
      </div>

      <div className="relative flex-1 bg-[#050508] overflow-hidden">
        <canvas
          ref={canvasRef}
          width={800}
          height={500}
          onClick={handleCanvasClick}
          onMouseMove={handleMouseMove}
          className="w-full h-full"
        />

        {nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center p-6 rounded-2xl bg-[#12121a]/80 border border-[#1e1e2e] backdrop-blur-xl">
              <Brain className="w-10 h-10 mx-auto text-zinc-600 mb-3" />
              <p className="text-[13px] text-zinc-400">No memories yet. Your brain graph will grow here.</p>
              <p className="text-[11px] text-zinc-600 mt-1 font-mono">Nodes = memories/notes, Edges = similarity &gt; 0.6</p>
            </div>
          </div>
        )}

        <div className="absolute bottom-3 left-3 flex gap-2">
          <span className="px-2 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-[10px] text-violet-300 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-violet-500" />memories {stats.memories}</span>
          <span className="px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-300 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" />notes {stats.notes}</span>
          <span className="px-2 py-1 rounded-full bg-[#1a1a26] border border-[#2a2a3e] text-[10px] text-zinc-500">{stats.connections} links • avg imp {stats.avgImportance}</span>
        </div>
      </div>

      {selected && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 border-t border-[#1e1e2e] bg-[#12121a]/80 backdrop-blur-xl"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${selected.type==='memory' ? 'bg-violet-500/10 text-violet-300 border-violet-500/20' : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'}`}>{selected.type}</span>
                <span className="text-[11px] text-zinc-500 font-mono">imp {selected.importance} • {selected.tags.join(', ') || 'no tags'}</span>
              </div>
              <div className="mt-2 text-[13px] text-zinc-200 leading-relaxed">{selected.content}</div>
              <div className="mt-2 flex gap-2">
                {edges.filter(e => e.source===selected.id || e.target===selected.id).slice(0,5).map(e => {
                  const otherId = e.source===selected.id ? e.target : e.source
                  const other = nodes.find(n=>n.id===otherId)
                  return other ? (
                    <span key={e.target+e.source} className="px-2 py-1 rounded-full bg-[#1a1a26] border border-[#2a2a3e] text-[10px] text-zinc-500">
                      ↔ {other.label.slice(0,20)} ({e.strength.toFixed(2)})
                    </span>
                  ) : null
                })}
              </div>
            </div>
            <button onClick={() => setSelected(null)} className="w-7 h-7 rounded-full bg-[#1a1a26] border border-[#2a2a3e] flex items-center justify-center text-zinc-500 hover:text-white">✕</button>
          </div>
        </motion.div>
      )}

      <div className="p-3 border-t border-[#1e1e2e] bg-violet-500/5">
        <h4 className="text-[11px] font-medium text-violet-300 flex items-center gap-1.5"><Zap className="w-3 h-3" />How graph works (frontend)</h4>
        <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed">
          Nodes = IndexedDB memories/notes. Edges = cosine similarity &gt; 0.6 (384-dim) or tag overlap. Physics: repulsion + spring attraction, runs in canvas RAF. Click node to inspect. 100% local.
        </p>
      </div>
    </div>
  )
}
