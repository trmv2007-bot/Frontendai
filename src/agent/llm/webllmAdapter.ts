import type { LLMAdapter } from './adapter'
import type { Message, ToolDefinition } from '../types'

export const WEBLLM_VERSION = '0.2.85'

const CDN_SOURCES = [
  `https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@${WEBLLM_VERSION}/+esm`,
  `https://esm.sh/@mlc-ai/web-llm@${WEBLLM_VERSION}?bundle`
]

export function webllmSources(): string[] {
  let override: string | null = null
  try { override = typeof localStorage !== 'undefined' ? localStorage.getItem('frontendai:webllm.url') : null } catch { override = null }
  return override ? [override, ...CDN_SOURCES] : CDN_SOURCES
}

let cachedModule: Promise<any> | null = null

export function loadWebLLMModule(onSource?: (url: string) => void): Promise<any> {
  if (!cachedModule) {
    const attempt = (async () => {
      const failures: string[] = []
      for (const source of webllmSources()) {
        onSource?.(source)
        try {
          const mod = await import(/* @vite-ignore */ source)
          if (mod && typeof mod.CreateMLCEngine === 'function') return mod
          failures.push(`${source} — no CreateMLCEngine export`)
        } catch (e: any) { failures.push(`${source} — ${e?.message || e}`) }
      }
      throw new Error(`Could not load the WebLLM runtime (${WEBLLM_VERSION}). Tried:\n- ${failures.join('\n- ')}`)
    })()
    cachedModule = attempt
    void attempt.catch(() => { if (cachedModule === attempt) cachedModule = null })
  }
  return cachedModule
}

const FRONTENDAI_SYSTEM_PROMPT = `You are FrontendAI, an AI agent that lives inside the user's application.

Your job is to help the user directly and naturally. Treat the user's message as the primary request.
- Respond conversationally and concisely.
- For greetings such as "hi", greet the user. Do not analyze the application's memory, context, or possible chatbot responses unless the user asks you to.
- Never expose or narrate internal environment context, retrieved memories, planning metadata, or implementation details unless explicitly requested.
- When the user asks you to do something in the application, use the available application tools when appropriate, then explain what you did.
- If a request needs more information, ask one focused question instead of inventing details.
- Do not pretend that an action was performed when it was not.
- You are an application agent, not a tutorial explaining how an AI agent could behave.`

function toChatMessage(message: Message) {
  const role = message.role === 'system' ? 'system' : message.role === 'assistant' ? 'assistant' : 'user'
  return { role, content: message.content }
}

export class WebLLMAdapter implements LLMAdapter {
  name = 'webllm'
  private engine: any = null
  private modelId: string
  lastError: string | null = null

  constructor(modelId = 'Llama-3.2-1B-Instruct-q4f32_1-MLC') { this.modelId = modelId }

  async isAvailable() { return typeof navigator !== 'undefined' && !!navigator.gpu && globalThis.isSecureContext !== false }

  async init(onProgress?: (p: any) => void) {
    if (this.engine) return true
    try {
      const { CreateMLCEngine } = await loadWebLLMModule(url => onProgress?.({ text: `Fetching WebLLM runtime from ${new URL(url).host}…`, progress: 0 }))
      onProgress?.({ text: `Creating engine for ${this.modelId}…`, progress: 0 })
      this.engine = await CreateMLCEngine(this.modelId, { initProgressCallback: onProgress })
      this.lastError = null
      return true
    } catch (e: any) { this.lastError = e?.message || String(e); console.warn('WebLLM init failed', e); return false }
  }

  async streamChat(messages: Message[], _tools: ToolDefinition[], onChunk: (c: any) => void) {
    if (!this.engine) {
      const ok = await this.init((p: any) => onChunk({ thought: `Loading ${this.modelId}: ${p.text}` }))
      if (!ok) {
        const why = !globalThis.navigator?.gpu ? 'WebGPU is not available in this browser (or this is not a secure context).' : (this.lastError || 'Unknown error')
        onChunk({ text: `WebLLM unavailable. ${why}\n\nSwitch to Mock or BYOK in settings.` }); onChunk({ done: true }); return
      }
    }

    try {
      const modelMessages = [
        { role: 'system', content: FRONTENDAI_SYSTEM_PROMPT },
        ...messages.filter(message => message.role !== 'tool').map(toChatMessage)
      ]
      const chunks = await this.engine.chat.completions.create({ messages: modelMessages, stream: true, temperature: 0.7 })
      for await (const chunk of chunks) {
        const text = chunk.choices[0]?.delta?.content
        if (text) onChunk({ text })
      }
    } catch (e: any) { onChunk({ text: `WebLLM error: ${e.message}` }) }
    onChunk({ done: true })
  }
}
