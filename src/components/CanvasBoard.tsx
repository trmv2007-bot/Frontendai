import { useRef, useEffect, useState } from 'react'
import { Pencil, Square, Circle, Type, Eraser, Trash2, Download, Palette, Undo, Save } from 'lucide-react'
import { db } from '../agent/memory/db'

type Tool = 'pencil' | 'rect' | 'circle' | 'text' | 'eraser'
type DrawingAction = {
  id: string
  tool: Tool
  color: string
  lineWidth: number
  points: { x: number, y: number }[]
  text?: string
}

export function CanvasBoard() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [tool, setTool] = useState<Tool>('pencil')
  const [color, setColor] = useState('#8b5cf6')
  const [lineWidth, setLineWidth] = useState(3)
  const [isDrawing, setIsDrawing] = useState(false)
  const [actions, setActions] = useState<DrawingAction[]>([])
  const [currentAction, setCurrentAction] = useState<DrawingAction | null>(null)
  const [history, setHistory] = useState<DrawingAction[][]>([])

  const colors = ['#8b5cf6', '#06ffa5', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899', '#ffffff', '#a1a1aa']

  // Load saved drawing
  useEffect(() => {
    const saved = localStorage.getItem('frontendai_canvas')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setActions(parsed)
      } catch {}
    }

    const handleExternalUpdate = (e: any) => {
      const action = e.detail
      if (action) {
        setActions(prev => [...prev, action])
      }
    }

    window.addEventListener('frontendai:canvas-update' as any, handleExternalUpdate)
    return () => window.removeEventListener('frontendai:canvas-update' as any, handleExternalUpdate)
  }, [])

  // Save
  useEffect(() => {
    localStorage.setItem('frontendai_canvas', JSON.stringify(actions))
  }, [actions])

  // Redraw
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.03)'
    ctx.lineWidth = 1
    for (let x = 0; x < canvas.width; x += 32) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, canvas.height)
      ctx.stroke()
    }
    for (let y = 0; y < canvas.height; y += 32) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(canvas.width, y)
      ctx.stroke()
    }

    const drawAction = (action: DrawingAction) => {
      ctx.strokeStyle = action.color
      ctx.fillStyle = action.color
      ctx.lineWidth = action.lineWidth
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      if (action.tool === 'pencil' || action.tool === 'eraser') {
        if (action.tool === 'eraser') {
          ctx.globalCompositeOperation = 'destination-out'
        } else {
          ctx.globalCompositeOperation = 'source-over'
        }
        ctx.beginPath()
        action.points.forEach((p, i) => {
          if (i === 0) ctx.moveTo(p.x, p.y)
          else ctx.lineTo(p.x, p.y)
        })
        ctx.stroke()
        ctx.globalCompositeOperation = 'source-over'
      } else if (action.tool === 'rect' && action.points.length >= 2) {
        const start = action.points[0]
        const end = action.points[action.points.length-1]
        ctx.strokeRect(start.x, start.y, end.x - start.x, end.y - start.y)
      } else if (action.tool === 'circle' && action.points.length >= 2) {
        const start = action.points[0]
        const end = action.points[action.points.length-1]
        const radius = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2))
        ctx.beginPath()
        ctx.arc(start.x, start.y, radius, 0, Math.PI*2)
        ctx.stroke()
      } else if (action.tool === 'text' && action.text) {
        ctx.font = `${action.lineWidth*6}px monospace`
        ctx.fillText(action.text, action.points[0]?.x || 0, action.points[0]?.y || 0)
      }
    }

    actions.forEach(drawAction)
    if (currentAction) drawAction(currentAction)
  }, [actions, currentAction])

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height)
    }
  }

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const pos = getPos(e)
    setIsDrawing(true)
    
    if (tool === 'text') {
      const text = prompt('Enter text:')
      if (text) {
        const action: DrawingAction = {
          id: Math.random().toString(36).slice(2,9),
          tool,
          color,
          lineWidth,
          points: [pos],
          text
        }
        setHistory(h => [...h, actions])
        setActions(a => [...a, action])
      }
      return
    }

    setCurrentAction({
      id: Math.random().toString(36).slice(2,9),
      tool,
      color,
      lineWidth,
      points: [pos]
    })
  }

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !currentAction) return
    const pos = getPos(e)
    setCurrentAction({
      ...currentAction,
      points: [...currentAction.points, pos]
    })
  }

  const endDrawing = () => {
    if (!isDrawing) return
    setIsDrawing(false)
    if (currentAction) {
      setHistory(h => [...h, actions])
      setActions(a => [...a, currentAction])
      setCurrentAction(null)
    }
  }

  const undo = () => {
    if (history.length === 0) return
    const prev = history[history.length-1]
    setActions(prev)
    setHistory(h => h.slice(0,-1))
  }

  const clear = () => {
    if (!confirm('Clear canvas?')) return
    setHistory(h => [...h, actions])
    setActions([])
  }

  const saveAsNote = async () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dataUrl = canvas.toDataURL('image/png')
    const id = Math.random().toString(36).slice(2,9)
    await db.notes.add({
      id,
      title: `Canvas ${new Date().toLocaleString()}`,
      content: `Canvas drawing saved. ${actions.length} strokes. \n\n![canvas](${dataUrl.slice(0,100)}...)\n\nData URL length: ${dataUrl.length} chars (full image stored in localStorage, not in note).`,
      created: Date.now(),
      updated: Date.now(),
      tags: ['canvas', 'drawing']
    })
    alert('Saved to notes vault!')
  }

  const exportImage = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const url = canvas.toDataURL('image/png')
    const a = document.createElement('a')
    a.href = url
    a.download = `frontendai-canvas-${Date.now()}.png`
    a.click()
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#050508]">
      {/* toolbar */}
      <div className="shrink-0 p-2 border-b border-[#1e1e2e] flex items-center gap-2 overflow-x-auto">
        <div className="flex items-center gap-1 p-1 rounded-full bg-[#1a1a26] border border-[#2a2a3e]">
          {[
            { id: 'pencil', icon: Pencil, label: 'Draw' },
            { id: 'rect', icon: Square, label: 'Rect' },
            { id: 'circle', icon: Circle, label: 'Circle' },
            { id: 'text', icon: Type, label: 'Text' },
            { id: 'eraser', icon: Eraser, label: 'Eraser' },
          ].map(t => {
            const Icon = t.icon as any
            return (
              <button
                key={t.id}
                onClick={() => setTool(t.id as Tool)}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${tool===t.id ? 'bg-white text-black' : 'text-zinc-500 hover:text-white hover:bg-[#232334]'}`}
                title={t.label}
              >
                <Icon className="w-4 h-4" />
              </button>
            )
          })}
        </div>

        <div className="flex items-center gap-1 p-1 rounded-full bg-[#1a1a26] border border-[#2a2a3e]">
          {colors.map(c => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`w-6 h-6 rounded-full border-2 transition-all ${color===c ? 'border-white scale-110' : 'border-transparent'}`}
              style={{ background: c }}
            />
          ))}
          <div className="w-px h-4 bg-[#2a2a3e] mx-1" />
          <Palette className="w-3 h-3 text-zinc-600" />
          <input type="color" value={color} onChange={e=>setColor(e.target.value)} className="w-6 h-6 rounded-full bg-transparent border-0 p-0 cursor-pointer" />
        </div>

        <div className="flex items-center gap-1">
          <input type="range" min={1} max={20} value={lineWidth} onChange={e=>setLineWidth(parseInt(e.target.value))} className="w-20 accent-violet-500" />
          <span className="text-[11px] font-mono text-zinc-500 w-6">{lineWidth}</span>
        </div>

        <div className="ml-auto flex items-center gap-1">
          <button onClick={undo} className="w-8 h-8 rounded-full bg-[#1a1a26] border border-[#2a2a3e] flex items-center justify-center text-zinc-400 hover:text-white"><Undo className="w-4 h-4" /></button>
          <button onClick={saveAsNote} className="w-8 h-8 rounded-full bg-[#1a1a26] border border-[#2a2a3e] flex items-center justify-center text-zinc-400 hover:text-white" title="Save to vault"><Save className="w-4 h-4" /></button>
          <button onClick={exportImage} className="w-8 h-8 rounded-full bg-[#1a1a26] border border-[#2a2a3e] flex items-center justify-center text-zinc-400 hover:text-white" title="Export PNG"><Download className="w-4 h-4" /></button>
          <button onClick={clear} className="w-8 h-8 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 hover:bg-red-500/20" title="Clear"><Trash2 className="w-4 h-4" /></button>
        </div>
      </div>

      {/* canvas */}
      <div className="flex-1 relative overflow-hidden bg-[#0a0a0f]">
        <canvas
          ref={canvasRef}
          width={1200}
          height={800}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={endDrawing}
          onMouseLeave={endDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={endDrawing}
          className="absolute inset-0 w-full h-full cursor-crosshair touch-none"
        />
        
        <div className="absolute bottom-3 left-3 px-2 py-1 rounded-full bg-black/60 border border-white/10 text-[10px] font-mono text-zinc-500">
          {actions.length} strokes • {tool} • {color} • Agent can draw via drawOnCanvas tool
        </div>
      </div>

      <div className="shrink-0 p-2 border-t border-[#1e1e2e] bg-[#12121a]/50 text-[11px] text-zinc-500">
        <span>💡 Tip: Agent can call </span>
        <code className="px-1.5 py-0.5 rounded bg-[#1a1a26] border border-[#2a2a3e] text-violet-300">drawOnCanvas</code>
        <span> to sketch ideas. Try "draw a diagram of..."</span>
      </div>
    </div>
  )
}
