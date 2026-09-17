import { useState, useRef, useEffect } from 'react'
import { Send, Trash2, Sparkles, Eye, Brain, Wrench, Mic, Volume2 } from 'lucide-react'
import type { Message, AgentState } from '../agent/types'
import { cn } from '../lib/utils'
import { useVoice } from '../hooks/useVoice'

export function Chat({ messages, onSend, onClear, state }: { messages: Message[], onSend: (t: string) => void, onClear: () => void, state: AgentState }) {
  const [input, setInput] = useState('')
  const listRef = useRef<HTMLDivElement>(null)
  const voice = useVoice()
  const [autoSpeak, setAutoSpeak] = useState(false)

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  // Auto speak last assistant message if enabled
  useEffect(() => {
    if (!autoSpeak) return
    const last = messages[messages.length-1]
    if (last && last.role === 'assistant' && !last.isStreaming && last.content) {
      voice.speak(last.content.slice(0,500))
    }
  }, [messages])

  const suggestions = [
    "Read this page and summarize",
    "Take screenshot and analyze",
    "Remember my name is Alex",
    "Create a note about this agent",
    "What can you do?",
    "Search my memory",
    "Calculate 234 * 89",
    "Speak hello in voice mode"
  ]

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div ref={listRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="py-10 text-center space-y-6">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center shadow-[0_0_30px_rgba(139,92,246,0.5)]">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <div>
              <h3 className="text-[16px] font-semibold tracking-tight">FrontendAI lives here</h3>
              <p className="text-[13px] text-zinc-500 mt-2 max-w-[300px] mx-auto leading-relaxed">
                I run 100% in your browser. No backend. I can read the page, remember things, manage notes/tasks, run code.
                Everything stays in IndexedDB.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 max-w-[340px] mx-auto">
              {suggestions.map(s => (
                <button
                  key={s}
                  onClick={() => onSend(s)}
                  className="text-left p-3 rounded-xl bg-[#1a1a26] hover:bg-[#232334] border border-[#2a2a3e] text-[12px] text-zinc-300 hover:text-white transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="flex items-center justify-center gap-2 text-[11px] text-zinc-600 font-mono flex-wrap">
              <span className="px-2 py-1 rounded-full bg-[#1a1a26] border border-[#2a2a3e]">WebLLM ready</span>
              <span className="px-2 py-1 rounded-full bg-[#1a1a26] border border-[#2a2a3e]">IndexedDB</span>
              <span className="px-2 py-1 rounded-full bg-[#1a1a26] border border-[#2a2a3e]">Voice: {voice.isSupported ? 'yes' : 'no'}</span>
              <span className="px-2 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300">Vision local</span>
              <span className="px-2 py-1 rounded-full bg-[#1a1a26] border border-[#2a2a3e]">Tools: 16</span>
            </div>
          </div>
        )}

        {messages.map(m => (
          <div key={m.id} className={cn("flex gap-3", m.role === 'user' ? 'justify-end' : 'justify-start')}>
            {m.role !== 'user' && (
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 shrink-0 flex items-center justify-center mt-1">
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </div>
            )}
            <div className={cn(
              "max-w-[80%] rounded-2xl px-4 py-3 text-[13px] leading-[1.5] space-y-2",
              m.role === 'user' 
                ? "bg-white text-black rounded-br-sm" 
                : "bg-[#1a1a26] border border-[#2a2a3e] text-zinc-200 rounded-bl-sm"
            )}>
              {m.thought && (
                <div className="flex gap-2 p-2 rounded-xl bg-[#12121a] border border-[#2a2a3e]/50 text-[11px] font-mono text-zinc-400">
                  <Brain className="w-3 h-3 shrink-0 mt-0.5" />
                  <span className="line-clamp-3">{m.thought.slice(0,300)}</span>
                </div>
              )}
              <div className="whitespace-pre-wrap break-words">{m.content || (m.isStreaming ? '...' : '')}</div>
              
              {m.toolCalls && m.toolCalls.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-white/10">
                  {m.toolCalls.map(tc => (
                    <div key={tc.id} className={cn(
                      "flex items-center gap-2 px-2.5 py-1.5 rounded-full text-[11px] font-mono border",
                      tc.status === 'success' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300" :
                      tc.status === 'error' ? "bg-red-500/10 border-red-500/20 text-red-300" :
                      tc.status === 'running' ? "bg-amber-500/10 border-amber-500/20 text-amber-300 animate-pulse" :
                      "bg-[#232334] border-[#2a2a3e] text-zinc-400"
                    )}>
                      <Wrench className="w-3 h-3" />
                      <span>{tc.name}</span>
                      <span className="opacity-60 truncate">{JSON.stringify(tc.arguments).slice(0,60)}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2 text-[10px] opacity-50">
                <span>{new Date(m.timestamp).toLocaleTimeString()}</span>
                {m.isStreaming && <span className="w-1 h-3 bg-current animate-pulse inline-block" />}
                {m.role === 'assistant' && !m.isStreaming && (
                  <button
                    onClick={() => voice.speak(m.content.slice(0,500))}
                    className="ml-2 px-2 py-0.5 rounded-full bg-[#232334] hover:bg-violet-500/20 text-zinc-400 hover:text-violet-300 flex items-center gap-1 transition-colors"
                  >
                    <Volume2 className="w-3 h-3" /> speak
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {state.status !== 'idle' && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 shrink-0 flex items-center justify-center">
              <Eye className="w-3.5 h-3.5 text-white animate-pulse" />
            </div>
            <div className="bg-[#1a1a26] border border-[#2a2a3e] rounded-2xl rounded-bl-sm px-4 py-3">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce" />
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce [animation-delay:0.1s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce [animation-delay:0.2s]" />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="shrink-0 p-3 border-t border-[#1e1e2e] bg-[#12121a]/80 backdrop-blur-xl space-y-2">
        {voice.isListening && (
          <div className="flex items-center gap-2 p-2 rounded-full bg-red-500/10 border border-red-500/20 text-[12px] text-red-300">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            Listening: {voice.interimTranscript || '...'} 
            <button onClick={() => voice.stopListening()} className="ml-auto px-2 py-0.5 rounded-full bg-red-500 text-white text-[10px]">stop</button>
          </div>
        )}
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  if (input.trim()) { onSend(input.trim()); setInput('') }
                }
              }}
              placeholder={state.status === 'idle' ? "Ask, or 'screenshot', 'speak hello'..." : `${state.status}...`}
              className="w-full h-11 pl-4 pr-24 rounded-full bg-[#1a1a26] border border-[#2a2a3e] focus:border-violet-500/50 focus:outline-none text-[13px] placeholder:text-zinc-600"
            />
            <div className="absolute right-1.5 top-1.5 flex items-center gap-1">
              <button
                onClick={() => {
                  if (voice.isListening) voice.stopListening()
                  else voice.startListening((t) => { setInput(t); })
                }}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${voice.isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-[#232334] text-zinc-400 hover:text-white'}`}
                title="Voice input"
              >
                <Mic className="w-4 h-4" />
              </button>
              <button
                onClick={() => { if (input.trim()) { onSend(input.trim()); setInput('') } }}
                className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center hover:bg-zinc-200 transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
          <button
            onClick={onClear}
            className="w-11 h-11 rounded-full bg-[#1a1a26] border border-[#2a2a3e] hover:bg-[#232334] flex items-center justify-center text-zinc-500 hover:text-zinc-300 transition-colors"
            title="Clear chat"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-zinc-600">
          <button
            onClick={() => setAutoSpeak(!autoSpeak)}
            className={`flex items-center gap-1 px-2 py-1 rounded-full border ${autoSpeak ? 'bg-violet-500/20 border-violet-500/30 text-violet-300' : 'bg-[#1a1a26] border-[#2a2a3e] text-zinc-500'}`}
          >
            <Volume2 className="w-3 h-3" /> {autoSpeak ? 'Auto-speak ON' : 'Auto-speak OFF'}
          </button>
          <span className="hidden md:inline">Enter to send • 🎤 voice • 📷 vision in Vision tab</span>
          <span className="ml-auto flex items-center gap-1"><span className="w-1 h-1 rounded-full bg-emerald-500" />frontend only</span>
        </div>
      </div>
    </div>
  )
}
