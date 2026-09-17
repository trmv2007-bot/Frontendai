import { useEffect, useState } from 'react'
import { getSummarizerConfig, setSummarizerConfig, summarizeMemories, shouldSummarize, startAutoSummarizer, stopAutoSummarizer } from '../agent/memory/summarizer'
import { db } from '../agent/memory/db'
import type { MemoryItem } from '../agent/types'
import { Brain, Sparkles, Play, Settings, Clock, Zap } from 'lucide-react'

export function AutoMemoryPanel() {
  const [config, setConfig] = useState(getSummarizerConfig())
  const [isRunning, setIsRunning] = useState(false)
  const [lastSummary, setLastSummary] = useState<MemoryItem[]>([])
  const [messageCount, setMessageCount] = useState(0)
  const [memoryCount, setMemoryCount] = useState(0)
  const [progress, setProgress] = useState('')

  useEffect(() => {
    db.messages.count().then(setMessageCount)
    db.memories.count().then(setMemoryCount)
    const interval = setInterval(() => {
      db.messages.count().then(setMessageCount)
      db.memories.count().then(setMemoryCount)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    // Start auto summarizer if enabled
    if (config.enabled) {
      startAutoSummarizer((mems) => {
        setLastSummary(mems)
        setMemoryCount(prev => prev + mems.length)
      })
      setIsRunning(true)
    }
    return () => stopAutoSummarizer()
  }, [])

  const toggleEnabled = () => {
    const next = setSummarizerConfig({ enabled: !config.enabled })
    setConfig(next)
    if (next.enabled) {
      startAutoSummarizer((mems) => setLastSummary(mems))
      setIsRunning(true)
    } else {
      stopAutoSummarizer()
      setIsRunning(false)
    }
  }

  const runNow = async () => {
    setProgress('Checking if summarization needed...')
    const should = await shouldSummarize()
    if (!should) {
      setProgress(`Not needed yet — ${messageCount} messages, need ${config.maxMessagesBeforeSummary}`)
      return
    }

    setProgress('Summarizing old chats into memories...')
    try {
      const mems = await summarizeMemories()
      setLastSummary(mems)
      setProgress(`Created ${mems.length} new memories from ${messageCount} messages`)
      setMemoryCount(await db.memories.count())
    } catch (e: any) {
      setProgress(`Failed: ${e.message}`)
    }
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
          <Brain className="w-4 h-4 text-white" />
        </div>
        <div>
          <h3 className="text-[13px] font-medium">Auto-Memory Summarization • 100% Local</h3>
          <p className="text-[11px] text-zinc-500">Summarizes old chats into long-term memories, runs in background</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="p-3 rounded-xl bg-[#1a1a26] border border-[#2a2a3e] text-center">
          <div className="text-[18px] font-bold text-white">{messageCount}</div>
          <div className="text-[10px] uppercase tracking-wide text-zinc-500">Messages</div>
        </div>
        <div className="p-3 rounded-xl bg-[#1a1a26] border border-[#2a2a3e] text-center">
          <div className="text-[18px] font-bold text-violet-400">{memoryCount}</div>
          <div className="text-[10px] uppercase tracking-wide text-zinc-500">Memories</div>
        </div>
        <div className="p-3 rounded-xl bg-[#1a1a26] border border-[#2a2a3e] text-center">
          <div className={`text-[18px] font-bold ${isRunning ? 'text-emerald-400' : 'text-zinc-600'}`}>{isRunning ? 'ON' : 'OFF'}</div>
          <div className="text-[10px] uppercase tracking-wide text-zinc-500">Auto</div>
        </div>
      </div>

      <div className="p-3 rounded-xl bg-[#1a1a26] border border-[#2a2a3e] space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-medium text-zinc-300 flex items-center gap-1.5"><Settings className="w-4 h-4" /> Auto-summarizer</span>
          <button
            onClick={toggleEnabled}
            className={`px-3 py-1 rounded-full text-[11px] font-medium border transition-colors ${config.enabled ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' : 'bg-[#232334] text-zinc-500 border-[#2a2a3e]'}`}
          >
            {config.enabled ? 'Enabled' : 'Disabled'}
          </button>
        </div>

        <div className="space-y-2">
          <label className="text-[11px] text-zinc-500">Summarize after N messages</label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={10}
              max={100}
              value={config.maxMessagesBeforeSummary}
              onChange={e => {
                const next = setSummarizerConfig({ maxMessagesBeforeSummary: parseInt(e.target.value) })
                setConfig(next)
              }}
              className="flex-1 accent-violet-500"
            />
            <span className="text-[11px] font-mono text-zinc-400 w-8">{config.maxMessagesBeforeSummary}</span>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[11px] text-zinc-500">Min importance to keep</label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={1}
              max={10}
              value={config.minImportance}
              onChange={e => {
                const next = setSummarizerConfig({ minImportance: parseInt(e.target.value) })
                setConfig(next)
              }}
              className="flex-1 accent-violet-500"
            />
            <span className="text-[11px] font-mono text-zinc-400 w-8">{config.minImportance}</span>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[11px] text-zinc-500">Interval (minutes)</label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={1}
              max={30}
              value={config.intervalMs / 60000}
              onChange={e => {
                const next = setSummarizerConfig({ intervalMs: parseInt(e.target.value) * 60000 })
                setConfig(next)
              }}
              className="flex-1 accent-violet-500"
            />
            <span className="text-[11px] font-mono text-zinc-400 w-12">{config.intervalMs/60000} min</span>
          </div>
        </div>

        <button
          onClick={runNow}
          className="w-full h-9 rounded-full bg-white text-black text-[12px] font-medium flex items-center justify-center gap-1.5 hover:bg-zinc-200"
        >
          <Play className="w-4 h-4" /> Summarize now
        </button>

        {progress && (
          <div className="p-2 rounded-xl bg-[#12121a] border border-[#1e1e2e] text-[11px] font-mono text-zinc-400">{progress}</div>
        )}
      </div>

      {lastSummary.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-[11px] font-medium uppercase tracking-widest text-zinc-500 flex items-center gap-1.5"><Sparkles className="w-3 h-3" /> Last summary • {lastSummary.length} memories</h4>
          {lastSummary.map(m => (
            <div key={m.id} className="p-3 rounded-xl bg-[#1a1a26] border border-[#2a2a3e]">
              <div className="text-[12px] text-zinc-200 leading-relaxed">{m.content}</div>
              <div className="flex items-center gap-2 mt-2">
                <span className="px-1.5 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-[10px]">imp {m.importance}</span>
                <span className="text-[10px] font-mono text-zinc-600">{m.type} • {m.tags.join(', ')}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="p-3 rounded-xl bg-violet-500/5 border border-violet-500/10">
        <h4 className="text-[11px] font-medium text-violet-300 flex items-center gap-1.5"><Zap className="w-3 h-3" />How auto-summarization works (frontend)</h4>
        <ul className="mt-1.5 text-[11px] text-zinc-500 leading-relaxed list-disc pl-4 space-y-0.5">
          <li><b>Trigger</b>: Every {config.intervalMs/60000}min, if messages ≥ {config.maxMessagesBeforeSummary}</li>
          <li><b>Windowing</b>: Groups messages by 30min windows or 10 messages, extracts facts</li>
          <li><b>Fact extraction</b>: Looks for "my name is", "I like", "remember", preferences</li>
          <li><b>Embedding</b>: Creates 384-dim vector via real embeddings if loaded, else pseudo</li>
          <li><b>Importance</b>: Scores based on fact density + keywords, filters by min importance</li>
          <li><b>Future</b>: Real impl would use LLM (WebLLM/BYOK) to summarize, not heuristics</li>
        </ul>
      </div>
    </div>
  )
}
