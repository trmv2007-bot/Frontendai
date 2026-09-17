import { useState, useRef } from 'react'
import { useVoiceClone } from '../hooks/useVoiceClone'
import { Mic, Square, Play, Trash2, Upload, Sparkles, Volume2, Loader2, Zap, Settings } from 'lucide-react'

export function VoiceClonePanel() {
  const voice = useVoiceClone()
  const [testText, setTestText] = useState('Hello! I am FrontendAI, your frontend-native companion. I live 100% in your browser, no backend!')
  const [profileName, setProfileName] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-fuchsia-500 to-violet-500 flex items-center justify-center">
          <Mic className="w-4 h-4 text-white" />
        </div>
        <div>
          <h3 className="text-[13px] font-medium">Voice Cloning • Web Audio API + SpeechSynthesis • 100% Local</h3>
          <p className="text-[11px] text-zinc-500">Record sample, analyze pitch/rate, create profile, TTS with cloned settings</p>
        </div>
      </div>

      <div className="p-3 rounded-xl bg-[#1a1a26] border border-[#2a2a3e] space-y-3">
        <h4 className="text-[12px] font-medium text-zinc-300 flex items-center gap-2"><Mic className="w-4 h-4" /> Record voice sample</h4>
        
        <div className="flex gap-2">
          <input
            value={profileName}
            onChange={e=>setProfileName(e.target.value)}
            placeholder="Profile name, e.g. My Voice"
            className="flex-1 h-9 px-3 rounded-full bg-[#12121a] border border-[#1e1e2e] text-[12px] focus:outline-none"
          />
          <button
            onClick={() => voice.isRecording ? voice.stopRecording(profileName) : voice.startRecording()}
            className={`h-9 px-4 rounded-full flex items-center gap-2 text-[12px] font-medium border transition-all ${
              voice.isRecording ? 'bg-red-500 text-white border-red-500 animate-pulse' : 'bg-white text-black border-white hover:bg-zinc-200'
            }`}
          >
            {voice.isRecording ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            {voice.isRecording ? 'Stop & analyze' : 'Record sample'}
          </button>
          <button onClick={() => fileRef.current?.click()} className="w-9 h-9 rounded-full bg-[#232334] border border-[#2a2a3e] flex items-center justify-center text-zinc-400 hover:text-white">
            <Upload className="w-4 h-4" />
          </button>
          <input ref={fileRef} type="file" accept="audio/*" className="hidden" onChange={async e => {
            const f = e.target.files?.[0]
            if (f) await voice.cloneFromSample(f, f.name)
          }} />
        </div>

        {(voice.isRecording || voice.isAnalyzing) && (
          <div className="flex items-center gap-2 p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[12px] text-amber-300">
            <Loader2 className="w-4 h-4 animate-spin" />
            {voice.isRecording ? 'Recording... speak clearly for 2-3 seconds' : 'Analyzing pitch & rate via Web Audio API...'}
          </div>
        )}

        {voice.error && (
          <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/20 text-[11px] text-red-300">{voice.error}</div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] text-zinc-500">Pitch: {voice.currentPitch.toFixed(2)}</label>
            <input type="range" min={0.5} max={2} step={0.1} value={voice.currentPitch} onChange={e=>voice.setCurrentPitch(parseFloat(e.target.value))} className="w-full accent-violet-500" />
          </div>
          <div>
            <label className="text-[11px] text-zinc-500">Rate: {voice.currentRate.toFixed(2)}</label>
            <input type="range" min={0.5} max={2} step={0.1} value={voice.currentRate} onChange={e=>voice.setCurrentRate(parseFloat(e.target.value))} className="w-full accent-violet-500" />
          </div>
        </div>
      </div>

      <div className="p-3 rounded-xl bg-[#1a1a26] border border-[#2a2a3e] space-y-3">
        <h4 className="text-[12px] font-medium text-zinc-300 flex items-center gap-2"><Volume2 className="w-4 h-4" /> Test TTS</h4>
        <textarea
          value={testText}
          onChange={e=>setTestText(e.target.value)}
          className="w-full min-h-[60px] p-3 rounded-xl bg-[#12121a] border border-[#1e1e2e] text-[13px] focus:outline-none resize-none"
        />
        <div className="flex gap-2">
          <button onClick={() => voice.speakWithSettings(testText)} className="flex-1 h-9 rounded-full bg-white text-black text-[12px] font-medium flex items-center justify-center gap-1.5">
            <Play className="w-4 h-4" /> Speak with current settings
          </button>
          <button onClick={() => speechSynthesis.cancel()} className="w-9 h-9 rounded-full bg-[#232334] border border-[#2a2a3e] flex items-center justify-center text-zinc-500">
            <Square className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div>
        <h4 className="text-[12px] font-medium uppercase tracking-widest text-zinc-500 flex items-center gap-2 mb-2"><Sparkles className="w-4 h-4" /> Voice Profiles • {voice.profiles.length}</h4>
        {voice.profiles.length === 0 ? (
          <div className="p-6 rounded-xl bg-[#1a1a26] border border-[#2a2a3e] text-center">
            <Mic className="w-8 h-8 mx-auto text-zinc-700 mb-2" />
            <p className="text-[13px] text-zinc-500">No voice profiles yet</p>
            <p className="text-[11px] text-zinc-600 mt-1">Record sample or upload audio to clone pitch/rate. 100% local.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {voice.profiles.map(p => (
              <div key={p.id} className="p-3 rounded-xl bg-[#1a1a26] border border-[#2a2a3e] group">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-medium text-zinc-200">{p.name}</span>
                      <span className="px-1.5 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-[10px]">pitch {p.pitch.toFixed(2)}</span>
                      <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[10px]">rate {p.rate.toFixed(2)}</span>
                    </div>
                    <div className="text-[11px] text-zinc-500 mt-1 font-mono">{p.voiceName} • {new Date(p.created).toLocaleString()} • {p.tags.join(', ')}</div>
                    {p.sampleUrl && (
                      <audio controls src={p.sampleUrl} className="mt-2 w-full h-8" />
                    )}
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => voice.speakWithProfile(testText, p)} className="w-7 h-7 rounded-full bg-white text-black flex items-center justify-center hover:bg-zinc-200"><Play className="w-3.5 h-3.5" /></button>
                    <button onClick={() => voice.deleteProfile(p.id)} className="w-7 h-7 rounded-full bg-[#232334] hover:bg-red-500/20 flex items-center justify-center text-zinc-500 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-3 rounded-xl bg-fuchsia-500/5 border border-fuchsia-500/10">
        <h4 className="text-[11px] font-medium text-fuchsia-300 flex items-center gap-1.5"><Zap className="w-3 h-3" />How voice cloning works (frontend, no server)</h4>
        <ul className="mt-1.5 text-[11px] text-zinc-500 leading-relaxed list-disc pl-4 space-y-0.5">
          <li><b>Record</b>: MediaRecorder captures audio/webm from mic, 100% local</li>
          <li><b>Analyze</b>: Web Audio API decodes, counts zero-crossings to estimate pitch, duration to estimate rate</li>
          <li><b>Profile</b>: Stores pitch, rate, volume, voiceName, sampleUrl in localStorage</li>
          <li><b>TTS</b>: SpeechSynthesisUtterance with profile pitch/rate/voice — browser TTS, no server</li>
          <li><b>Real cloning</b>: True voice cloning would need Coqui TTS or similar WASM model (future, ~100MB)</li>
          <li><b>Privacy</b>: Sample never uploaded, stays in blob URL + localStorage</li>
        </ul>
      </div>
    </div>
  )
}
