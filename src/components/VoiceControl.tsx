import { Mic, MicOff, Volume2, VolumeX, Waves, Settings2 } from 'lucide-react'
import { useVoice } from '../hooks/useVoice'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export function VoiceControl({ onTranscript }: { onTranscript?: (t: string) => void }) {
  const voice = useVoice()
  const [showVoices, setShowVoices] = useState(false)

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button
          onClick={() => voice.isListening ? voice.stopListening() : voice.startListening((text) => onTranscript?.(text))}
          className={`h-10 px-4 rounded-full flex items-center gap-2 text-[13px] font-medium border transition-all ${
            voice.isListening 
              ? 'bg-red-500 text-white border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.5)] animate-pulse' 
              : 'bg-[#1a1a26] border-[#2a2a3e] text-zinc-300 hover:bg-[#232334] hover:text-white'
          }`}
        >
          {voice.isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          {voice.isListening ? 'Stop listening' : 'Voice input'}
        </button>

        <button
          onClick={() => voice.isSpeaking ? voice.stopSpeaking() : voice.speak('Hello! I am FrontendAI, living 100% in your browser. I can see, hear, and remember.')}
          className={`w-10 h-10 rounded-full flex items-center justify-center border transition-all ${
            voice.isSpeaking
              ? 'bg-violet-600 text-white border-violet-600 shadow-[0_0_20px_rgba(139,92,246,0.5)]'
              : 'bg-[#1a1a26] border-[#2a2a3e] text-zinc-400 hover:text-white'
          }`}
          title={voice.isSpeaking ? 'Stop speaking' : 'Test voice'}
        >
          {voice.isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>

        <button
          onClick={() => setShowVoices(!showVoices)}
          className="w-10 h-10 rounded-full bg-[#1a1a26] border border-[#2a2a3e] flex items-center justify-center text-zinc-500 hover:text-zinc-300"
        >
          <Settings2 className="w-4 h-4" />
        </button>

        {!voice.isSupported && (
          <span className="text-[11px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-full">Web Speech API needs Chrome/Edge</span>
        )}
      </div>

      {/* waveform when listening/speaking */}
      <AnimatePresence>
        {(voice.isListening || voice.isSpeaking) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 40 }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-1 h-10 px-3 rounded-xl bg-[#1a1a26] border border-[#2a2a3e] overflow-hidden"
          >
            <Waves className={`w-4 h-4 ${voice.isListening ? 'text-red-400' : 'text-violet-400'} animate-pulse`} />
            <div className="flex items-center gap-[2px] ml-2">
              {Array.from({ length: 20 }).map((_, i) => (
                <motion.div
                  key={i}
                  className={`w-[3px] rounded-full ${voice.isListening ? 'bg-red-400' : 'bg-violet-400'}`}
                  animate={{ height: [4, 16 + Math.random()*16, 4] }}
                  transition={{ duration: 0.3 + Math.random()*0.4, repeat: Infinity, delay: i*0.05 }}
                />
              ))}
            </div>
            <span className="ml-3 text-[12px] font-mono text-zinc-400 truncate">
              {voice.isListening ? (voice.interimTranscript || voice.transcript || 'Listening...') : 'Speaking...'}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {voice.transcript && !voice.isListening && (
        <div className="p-3 rounded-xl bg-[#12121a] border border-[#1e1e2e]">
          <div className="text-[11px] uppercase tracking-wide text-zinc-500 mb-1">Last transcript</div>
          <div className="text-[13px] text-zinc-200">{voice.transcript}</div>
          <div className="mt-2 flex gap-2">
            <button
              onClick={() => { onTranscript?.(voice.transcript); voice.clearTranscript() }}
              className="px-3 py-1.5 rounded-full bg-white text-black text-[11px] font-medium"
            >
              Send to agent
            </button>
            <button
              onClick={() => voice.clearTranscript()}
              className="px-3 py-1.5 rounded-full bg-[#1a1a26] border border-[#2a2a3e] text-[11px] text-zinc-400"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {showVoices && (
        <div className="p-3 rounded-xl bg-[#1a1a26] border border-[#2a2a3e] max-h-[200px] overflow-y-auto">
          <div className="text-[11px] uppercase tracking-wide text-zinc-500 mb-2">Select voice (local TTS)</div>
          <div className="space-y-1">
            {voice.voices.map(v => (
              <button
                key={v.name}
                onClick={() => voice.setVoice(v)}
                className={`w-full text-left px-3 py-2 rounded-lg text-[12px] flex items-center justify-between ${
                  voice.selectedVoice?.name === v.name ? 'bg-violet-600/20 border border-violet-500/30 text-violet-200' : 'hover:bg-[#232334] text-zinc-400'
                }`}
              >
                <span>{v.name} <span className="opacity-50">({v.lang})</span></span>
                {v.default && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/10">default</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      {voice.error && (
        <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/20 text-[11px] text-red-300">{voice.error}</div>
      )}
    </div>
  )
}
