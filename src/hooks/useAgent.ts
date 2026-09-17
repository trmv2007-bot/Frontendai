import { useEffect, useState, useRef } from 'react'
import { AgentLoop } from '../agent/core/loop'
import { MockAdapter } from '../agent/llm/mockAdapter'
import { WebLLMAdapter } from '../agent/llm/webllmAdapter'
import { OpenAIAdapter } from '../agent/llm/openaiAdapter'
import { TOOL_DEFINITIONS } from '../agent/tools/definitions'
import type { AgentState, Message, LLMConfig, LLMProvider } from '../agent/types'
import { db } from '../agent/memory/db'

const DEFAULT_CONFIG: LLMConfig = {
  provider: 'mock',
  model: 'mock-v1',
  temperature: 0.7,
  maxTokens: 2048
}

function createAdapter(provider: LLMProvider, model: string, apiKey?: string, baseUrl?: string) {
  switch(provider) {
    case 'webllm': return new WebLLMAdapter(model)
    case 'openai':
    case 'groq':
    case 'openrouter':
    case 'ollama':
      return new OpenAIAdapter({ apiKey: apiKey || '', model, baseUrl })
    default:
      return new MockAdapter()
  }
}

export function useAgent() {
  const [config, setConfig] = useState<LLMConfig>(() => {
    const saved = localStorage.getItem('frontendai_llm')
    return saved ? JSON.parse(saved) : DEFAULT_CONFIG
  })
  const [state, setState] = useState<AgentState>({ status: 'idle', autonomy: 2, memoryCount: 0, isOnline: true })
  const [messages, setMessages] = useState<Message[]>([])
  const loopRef = useRef<AgentLoop | null>(null)

  useEffect(() => {
    const adapter = createAdapter(config.provider, config.model, config.apiKey, config.baseUrl)
    const loop = new AgentLoop(adapter, TOOL_DEFINITIONS)
    
    // load persisted messages
    db.messages.toArray().then(msgs => {
      if (msgs.length) setMessages(msgs.sort((a,b)=>a.timestamp-b.timestamp))
    })

    const unsubState = loop.subscribeState(setState)
    const unsubMsgs = loop.subscribeMessages(async (msgs) => {
      setMessages([...msgs])
      // persist
      const last = msgs[msgs.length-1]
      if (last && !last.isStreaming) {
        try { await db.messages.put(last) } catch {}
      }
    })

    loopRef.current = loop

    // memory count
    db.memories.count().then(c => setState(s => ({ ...s, memoryCount: c })))
    const interval = setInterval(() => db.memories.count().then(c => setState(s => ({ ...s, memoryCount: c }))), 3000)

    return () => {
      unsubState()
      unsubMsgs()
      clearInterval(interval)
    }
  }, [config.provider, config.model, config.apiKey, config.baseUrl])

  const send = (content: string) => loopRef.current?.sendUserMessage(content)
  const clear = async () => {
    await db.messages.clear()
    loopRef.current?.clear()
  }

  const updateConfig = (patch: Partial<LLMConfig>) => {
    const next = { ...config, ...patch }
    setConfig(next)
    localStorage.setItem('frontendai_llm', JSON.stringify(next))
  }

  return { state, messages, send, clear, config, updateConfig, loop: loopRef.current }
}
