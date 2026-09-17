import { Mic, Square, Upload, Loader2, FileAudio } from 'lucide-react'
import { useWhisper } from '../hooks/useWhisper'
import { useRef } from 'react'

export function WhisperControl({ onTranscript }: { onTranscript?: (t: string) => void }) {
  const whisper = useWhisper()
  const fileRef = useRef<HTMLInputElement>(null)

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button
          onClick={() => {
            if (whisper.status === 'transcribing' && whisper.isRecording) {
              whisper.stopRecording()
            } else {
              whisper.startRecording((text) => onTranscript?.(text))
            }
          }}
          className={`h-10 px-4 rounded-full flex items-center gap-2 text-[13px] font-medium border transition-all ${
            whisper.status === 'transcribing' && whisper.isRecording
              ? 'bg-red-500 text-white border-red-500 animate-pulse'
              : 'bg-[#1a1a26] border-[#2a2a3e] text-zinc-300 hover:bg-[#232334]'
          }`}
        >
          {whisper.status === 'transcribing' && whisper.isRecording ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          {whisper.isRecording ? 'Stop & transcribe' : 'Whisper local STT'}
        </button>

        <button
          onClick={() => fileRef.current?.click()}
          className="w-10 h-10 rounded-full bg-[#1a1a26] border border-[#2a2a3e] flex items-center justify-center text-zinc-400 hover:text-white"
        >
          <Upload className="w-4 h-4" />
        </button>
        <input ref={fileRef} type="file" accept="audio/*" className="hidden" onChange={async e => {
          const f = e.target.files?.[0]
          if (f) {
            const text = await whisper.transcribeFile(f)
            if (text) onTranscript?.(text)
          }
        }} />

        {whisper.status === 'loading' && <Loader2 className="w-4 h-4 animate-spin text-violet-400" />}
      </div>

      {(whisper.status !== 'idle' || whisper.progress) && (
        <div className="p-2 rounded-xl bg-[#1a1a26] border border-[#2a2a3e] flex items-center gap-2">
          {whisper.status === 'loading' || whisper.status === 'transcribing' ? <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-500" /> : <FileAudio className="w-3.5 h-3.5 text-zinc-500" />}
          <span className="text-[11px] font-mono text-zinc-400 truncate">{whisper.progress || whisper.status}</span>
        </div>
      )}

      {whisper.transcript && (
        <div className="p-3 rounded-xl bg-[#12121a] border border-[#1e1e2e]">
          <div className="text-[11px] uppercase tracking-wide text-zinc-500 mb-1">Whisper transcript (local)</div>
          <div className="text-[13px] text-zinc-200 leading-relaxed">{whisper.transcript}</div>
          <div className="mt-2 flex gap-2">
            <button onClick={() => onTranscript?.(whisper.transcript)} className="px-3 py-1.5 rounded-full bg-white text-black text-[11px] font-medium">Send to agent</button>
          </div>
        </div>
      )}

      <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/10">
        <h4 className="text-[11px] font-medium text-amber-300">Whisper tiny.en — 100% local, 40MB</h4>
        <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed">Runs in WASM via transformers.js. First load downloads model, then offline. No API key, no server. Fallback to Web Speech API if not loaded.</p>
      </div>
    </div>
  )
}
