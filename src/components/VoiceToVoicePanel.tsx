import { useVoiceToVoice } from '../hooks/useVoiceToVoice'
import { Mic, Square, Trash2, Volume2, Brain, Zap, Radio } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'

export function VoiceToVoicePanel({ onSend }: { onSend?: (text: string) => Promise<string> }) {
  const [isContinuous, setIsContinuous] = useState(false)

  const v2v = useVoiceToVoice(async (text) => {
    // Call main agent
    if (onSend) {
      const response = await onSend(text)
      return response
    }
    return `You said: "${text}". As FrontendAI living 100% in frontend, I hear you via Web Speech API and speak via SpeechSynthesis, no server.`
  })

  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Visualize audio
  useEffect(() => {
    if (!v2v.analyser || !canvasRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const analyser = v2v.analyser
    const dataArray = new Uint8Array(analyser.frequencyBinCount)

    let raf: number
    const draw = () => {
      analyser.getByteFrequencyData(dataArray)
      
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      
      const barWidth = canvas.width / dataArray.length * 2
      let x = 0

      for (let i = 0; i < dataArray.length; i++) {
        const barHeight = dataArray[i] / 2
        
        const gradient = ctx.createLinearGradient(0, canvas.height - barHeight, 0, canvas.height)
        gradient.addColorStop(0, v2v.status === 'listening' ? '#ef4444' : v2v.status === 'speaking' ? '#8b5cf6' : '#3a3a4e')
        gradient.addColorStop(1, 'transparent')
        
        ctx.fillStyle = gradient
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight)
        
        x += barWidth + 1
      }

      raf = requestAnimationFrame(draw)
    }

    draw()
    return () => cancelAnimationFrame(raf)
  }, [v2v.analyser, v2v.status])

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#050508]">
      <div className="shrink-0 p-3 border-b border-[#1e1e2e] space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-500 to-fuchsia-500 flex items-center justify-center">
            <Radio className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-[13px] font-medium">Voice-to-Voice • Real-time Conversation • 100% Local</h3>
            <p className="text-[11px] text-zinc-500">Speak → STT → LLM → TTS → loop, no server, Web Audio VAD</p>
          </div>
          <span className={`ml-auto px-2 py-0.5 rounded-full text-[10px] font-mono border ${
            v2v.status === 'listening' ? 'bg-red-500/10 text-red-300 border-red-500/20 animate-pulse' :
            v2v.status === 'speaking' ? 'bg-violet-500/10 text-violet-300 border-violet-500/20 animate-pulse' :
            v2v.status === 'thinking' ? 'bg-amber-500/10 text-amber-300 border-amber-500/20' :
            'bg-[#1a1a26] text-zinc-500 border-[#2a2a3e]'
          }`}>{v2v.status}</span>
        </div>

        <div className="relative h-20 rounded-xl bg-[#0a0a0f] border border-[#1e1e2e] overflow-hidden">
          <canvas ref={canvasRef} width={400} height={80} className="w-full h-full" />
          {!v2v.analyser && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[11px] font-mono text-zinc-600">Audio visualization when listening/speaking</span>
            </div>
          )}
          <div className="absolute bottom-1 left-2 text-[10px] font-mono text-zinc-600">
            {v2v.status === 'listening' ? '🔴 Listening — speak now' : v2v.status === 'speaking' ? '🟣 Speaking...' : v2v.status === 'thinking' ? '🟡 Thinking...' : '⚪ Idle'}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => v2v.status === 'idle' ? v2v.startListening(isContinuous) : v2v.stop()}
            className={`flex-1 h-11 rounded-full flex items-center justify-center gap-2 text-[13px] font-medium transition-all ${
              v2v.status === 'listening' ? 'bg-red-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.5)]' :
              v2v.status === 'speaking' ? 'bg-violet-600 text-white shadow-[0_0_20px_rgba(139,92,246,0.5)]' :
              'bg-white text-black hover:bg-zinc-200'
            }`}
          >
            {v2v.status === 'listening' ? <><Square className="w-4 h-4" /> Stop listening</> : v2v.status === 'speaking' ? <><Volume2 className="w-4 h-4 animate-pulse" /> Speaking...</> : <><Mic className="w-4 h-4" /> Start voice chat</>}
          </button>
          <button
            onClick={() => setIsContinuous(!isContinuous)}
            className={`px-4 h-11 rounded-full border text-[12px] font-medium ${isContinuous ? 'bg-violet-600/20 border-violet-500/30 text-violet-300' : 'bg-[#1a1a26] border-[#2a2a3e] text-zinc-500'}`}
          >
            {isContinuous ? 'Continuous ON' : 'Continuous OFF'}
          </button>
          <button onClick={v2v.clear} className="w-11 h-11 rounded-full bg-[#1a1a26] border border-[#2a2a3e] flex items-center justify-center text-zinc-500 hover:text-white">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        <label className="flex items-center gap-2 text-[11px] text-zinc-500">
          <input type="checkbox" checked={isContinuous} onChange={e=>setIsContinuous(e.target.checked)} className="rounded" />
          Continuous mode — auto-restart listening after speaking (real-time conversation)
        </label>

        {!v2v.isSupported && (
          <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300">Web Speech API needs Chrome/Edge. Try Chrome for best voice-to-voice.</div>
        )}
        {v2v.error && (
          <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/20 text-[11px] text-red-300">{v2v.error}</div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {v2v.messages.length === 0 ? (
          <div className="py-16 text-center">
            <Mic className="w-10 h-10 mx-auto text-zinc-700 mb-3" />
            <p className="text-[13px] text-zinc-500">No voice conversation yet</p>
            <p className="text-[11px] text-zinc-600 mt-1 max-w-[300px] mx-auto">Start voice chat, speak, agent will listen via Web Speech API, think, and speak back via TTS — all local, no server, real-time loop</p>
          </div>
        ) : (
          v2v.messages.map(m => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-2.5 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {m.role === 'assistant' && (
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shrink-0">
                  <Brain className="w-3.5 h-3.5 text-white" />
                </div>
              )}
              <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed ${m.role === 'user' ? 'bg-white text-black rounded-br-sm' : 'bg-[#1a1a26] border border-[#2a2a3e] text-zinc-200 rounded-bl-sm'}`}>
                <div className="whitespace-pre-wrap">{m.text}</div>
                <div className="text-[10px] opacity-50 mt-1">{new Date(m.timestamp).toLocaleTimeString()} {m.isFinal === false ? '• interim' : ''}</div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      <div className="shrink-0 p-3 border-t border-[#1e1e2e] bg-red-500/5">
        <h4 className="text-[11px] font-medium text-red-300 flex items-center gap-1.5"><Zap className="w-3 h-3" />How voice-to-voice works (frontend)</h4>
        <ul className="mt-1.5 text-[11px] text-zinc-500 leading-relaxed list-disc pl-4 space-y-0.5">
          <li><b>STT</b>: Web Speech API SpeechRecognition, continuous, interim results, 100% local in Chrome</li>
          <li><b>VAD</b>: Web Audio API AnalyserNode, frequency data, simple threshold, visualizes in canvas</li>
          <li><b>LLM</b>: User transcript → main agent (mock/BYOK/WebLLM) → response</li>
          <li><b>TTS</b>: SpeechSynthesis, speak response, onend → restart listening if continuous</li>
          <li><b>Loop</b>: listening → thinking → speaking → listening, real-time conversation, no server</li>
        </ul>
      </div>
    </div>
  )
}
