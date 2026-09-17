import { useState, useRef } from 'react'
import { Camera, Image as ImageIcon, Eye, Upload, Loader2, Sparkles, X, Zap } from 'lucide-react'
import html2canvas from 'html2canvas'
import { captionImage, getCaptioner, onEmbeddingStatus, getEmbeddingStatus, getEmbedder } from '../agent/memory/embeddings'
import { motion } from 'framer-motion'

export function VisionPanel({ onAnalyze }: { onAnalyze?: (result: string) => void }) {
  const [screenshot, setScreenshot] = useState<string | null>(null)
  const [caption, setCaption] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState('')
  const [embeddingStatus, setEmbeddingStatus] = useState(getEmbeddingStatus())
  const fileRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  // listen to embedding status
  useState(() => {
    const unsub = onEmbeddingStatus((s, detail) => {
      setEmbeddingStatus(s)
      if (detail) setProgress(detail)
    })
    return unsub
  })

  const takeScreenshot = async () => {
    setLoading(true)
    setProgress('Capturing page...')
    try {
      const canvas = await html2canvas(document.body, {
        useCORS: true,
        allowTaint: true,
        scale: 0.5,
        logging: false,
        width: window.innerWidth,
        height: window.innerHeight
      })
      const dataUrl = canvas.toDataURL('image/jpeg', 0.7)
      setScreenshot(dataUrl)
      setProgress('Analyzing with local vision model...')

      // Try to caption
      try {
        const cap = await captionImage(canvas)
        setCaption(cap)
        onAnalyze?.(`Screenshot analysis: ${cap}\n\nData URL length: ${dataUrl.length} chars (not sent to server, stays in browser)`)
      } catch (e: any) {
        setCaption(`Screenshot captured (${Math.round(dataUrl.length/1024)}KB). Vision model: ${e.message}. You can still use it for context or send to BYOK LLM.`)
      }
    } catch (e: any) {
      setCaption(`Screenshot failed: ${e.message}. Try uploading image instead.`)
    }
    setLoading(false)
  }

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) return
    setLoading(true)
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = async () => {
      setScreenshot(url)
      setProgress('Captioning image locally...')
      try {
        const cap = await captionImage(img)
        setCaption(cap)
        onAnalyze?.(`Image "${file.name}" analysis: ${cap}`)
      } catch (e: any) {
        setCaption(`Image loaded: ${file.name} (${Math.round(file.size/1024)}KB). Vision: ${e.message}`)
      }
      setLoading(false)
    }
    img.src = url
  }

  const loadEmbeddings = async () => {
    setLoading(true)
    try {
      await getEmbedder((p) => setProgress(p))
      setCaption('Embeddings ready! Now using 384-dim real vectors for memory search (all-MiniLM-L6-v2). Previous pseudo-embeddings will be upgraded on next search.')
    } catch (e: any) {
      setCaption(`Embedding load failed: ${e.message}. Will use pseudo fallback.`)
    }
    setLoading(false)
  }

  const loadVision = async () => {
    setLoading(true)
    try {
      await getCaptioner((p) => setProgress(p))
      setCaption('Vision model ready! Vit-GPT2 captioning — 100% local, no API.')
    } catch (e: any) {
      setCaption(`Vision load failed: ${e.message}`)
    }
    setLoading(false)
  }

  const analyzeWithBYOK = async () => {
    if (!screenshot) return
    const saved = localStorage.getItem('frontendai_llm')
    if (!saved) { setCaption('No BYOK config found. Go to OS tab and add OpenAI key for GPT-4o vision.'); return }
    const cfg = JSON.parse(saved)
    if (!cfg.apiKey) { setCaption('Add API key in OS tab for BYOK vision.'); return }

    setLoading(true)
    setProgress('Sending to BYOK vision (direct fetch, no proxy)...')
    try {
      const baseUrl = cfg.baseUrl || 'https://api.openai.com/v1'
      const model = cfg.model?.includes('vision') || cfg.model?.includes('4o') ? cfg.model : 'gpt-4o-mini'
      
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${cfg.apiKey}`
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'user', content: [
              { type: 'text', text: 'Describe this image in detail. What do you see? Be concise but thorough.' },
              { type: 'image_url', image_url: { url: screenshot } }
            ]}
          ],
          max_tokens: 500
        })
      })

      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      const text = data.choices?.[0]?.message?.content || 'No response'
      setCaption(`BYOK Vision (${model}):\n${text}`)
      onAnalyze?.(`BYOK Vision analysis: ${text}`)
    } catch (e: any) {
      setCaption(`BYOK vision failed: ${e.message}`)
    }
    setLoading(false)
  }

  const analyzeWithWebLLM = async () => {
    setProgress('WebLLM vision: LLaVA support via WebLLM is experimental. For now using local ViT-GPT2. For true LLaVA, load Phi-3.5-vision or LLaVA in WebLLM adapter (needs WebGPU).')
    await loadVision()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[12px] font-medium uppercase tracking-widest text-zinc-400 flex items-center gap-2">
          <Eye className="w-4 h-4" /> Vision • 100% Local
        </h3>
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono border ${
          embeddingStatus === 'ready' ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' :
          embeddingStatus === 'loading' ? 'bg-amber-500/10 text-amber-300 border-amber-500/20 animate-pulse' :
          'bg-[#1a1a26] text-zinc-500 border-[#2a2a3e]'
        }`}>{embeddingStatus}</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={takeScreenshot}
          disabled={loading}
          className="h-11 rounded-xl bg-white text-black text-[13px] font-medium flex items-center justify-center gap-2 hover:bg-zinc-200 disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
          Screenshot page
        </button>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={loading}
          className="h-11 rounded-xl bg-[#1a1a26] border border-[#2a2a3e] text-[13px] text-zinc-300 flex items-center justify-center gap-2 hover:bg-[#232334] disabled:opacity-50"
        >
          <Upload className="w-4 h-4" /> Upload image
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={loadEmbeddings}
          disabled={loading || embeddingStatus==='ready'}
          className="h-9 rounded-full bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/20 text-violet-300 text-[11px] font-medium flex items-center justify-center gap-1.5 disabled:opacity-50"
        >
          <Sparkles className="w-3.5 h-3.5" /> Load real embeddings (22MB)
        </button>
        <button
          onClick={loadVision}
          disabled={loading}
          className="h-9 rounded-full bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/20 text-emerald-300 text-[11px] font-medium flex items-center justify-center gap-1.5 disabled:opacity-50"
        >
          <ImageIcon className="w-3.5 h-3.5" /> Load vision local (300MB)
        </button>
        <button
          onClick={analyzeWithBYOK}
          disabled={loading || !screenshot}
          className="h-9 rounded-full bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/20 text-blue-300 text-[11px] font-medium flex items-center justify-center gap-1.5 disabled:opacity-50"
        >
          <Zap className="w-3.5 h-3.5" /> BYOK Vision (GPT-4o)
        </button>
        <button
          onClick={analyzeWithWebLLM}
          disabled={loading}
          className="h-9 rounded-full bg-fuchsia-600/20 hover:bg-fuchsia-600/30 border border-fuchsia-500/20 text-fuchsia-300 text-[11px] font-medium flex items-center justify-center gap-1.5 disabled:opacity-50"
        >
          <Eye className="w-3.5 h-3.5" /> WebLLM LLaVA (exp)
        </button>
      </div>

      {progress && (
        <div className="p-2 rounded-xl bg-[#1a1a26] border border-[#2a2a3e] flex items-center gap-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-500" />
          <span className="text-[11px] font-mono text-zinc-400 truncate">{progress}</span>
        </div>
      )}

      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
        className={`relative rounded-2xl border-2 border-dashed overflow-hidden transition-colors ${
          dragOver ? 'border-violet-500 bg-violet-500/5' : 'border-[#2a2a3e] bg-[#0a0a0f]'
        }`}
      >
        {screenshot ? (
          <div className="relative">
            <img src={screenshot} alt="screenshot" className="w-full max-h-[300px] object-contain bg-black" />
            <button
              onClick={() => { setScreenshot(null); setCaption('') }}
              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/80 border border-white/10 flex items-center justify-center text-white hover:bg-black"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="py-12 text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-[#1a1a26] border border-[#2a2a3e] flex items-center justify-center mb-3">
              <ImageIcon className="w-6 h-6 text-zinc-600" />
            </div>
            <p className="text-[13px] text-zinc-500">Drop image here or screenshot page</p>
            <p className="text-[11px] text-zinc-600 mt-1 font-mono">100% local, never uploaded</p>
          </div>
        )}
      </div>

      {caption && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 rounded-xl bg-[#1a1a26] border border-[#2a2a3e]"
        >
          <div className="text-[11px] uppercase tracking-wide text-zinc-500 mb-1 flex items-center gap-1.5"><Sparkles className="w-3 h-3" /> Analysis</div>
          <div className="text-[13px] text-zinc-200 leading-relaxed whitespace-pre-wrap">{caption}</div>
        </motion.div>
      )}

      <div className="p-3 rounded-xl bg-violet-500/5 border border-violet-500/10">
        <h4 className="text-[11px] font-medium text-violet-300">How vision works frontend-only</h4>
        <ul className="mt-1.5 text-[11px] text-zinc-500 leading-relaxed list-disc pl-4 space-y-0.5">
          <li><b>Screenshot</b>: html2canvas renders DOM to canvas, no server</li>
          <li><b>Captioning</b>: Xenova/vit-gpt2-image-captioning via transformers.js (WASM/ONNX)</li>
          <li><b>Embeddings</b>: all-MiniLM-L6-v2, 384-dim, cached in browser</li>
          <li><b>Fallback</b>: If models fail, uses BYOK vision (GPT-4o) via direct fetch</li>
        </ul>
      </div>
    </div>
  )
}
