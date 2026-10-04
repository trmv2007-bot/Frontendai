import type { LLMAdapter } from './adapter'
import type { Message, ToolDefinition } from '../types'

type PuterChunk = {
  type?: string
  text?: string
  name?: string
  id?: string
  input?: Record<string, unknown>
  tool_call_id?: string
  message?: { content?: string | null; tool_calls?: Array<{ id: string; function: { name: string; arguments: string } }> }
}

type PuterModel = {
  id: string
  provider?: string
  name?: string
  context?: number
  max_tokens?: number
}

type PuterAI = {
  chat: (messages: unknown, testMode?: boolean, options?: Record<string, unknown>) => Promise<any>
  listModels: (provider?: string | null) => Promise<PuterModel[]>
}

type PuterGlobal = { ai: PuterAI }

declare global {
  interface Window { puter?: PuterGlobal }
}

/** Strong-first model policy. The runtime confirms availability before using a candidate. */
export const PUTER_MODEL_CANDIDATES = [
  'openai/gpt-6.1-sol-pro',
  'openai/gpt-6.1-sol',
  'openai/gpt-5.6-sol-pro',
  'openai/gpt-5.6-sol',
  'openai/gpt-5.6-luna',
  'openai/gpt-5.5',
] as const

export class PuterAdapter implements LLMAdapter {
  name = 'puter'
  private model: string
  private resolvedModel?: string

  constructor(model = PUTER_MODEL_CANDIDATES[0]) {
    this.model = model
  }

  get activeModel() { return this.resolvedModel ?? this.model }

  async isAvailable() {
    return Boolean(window.puter?.ai?.chat && window.puter?.ai?.listModels)
  }

  /**
   * Ask Puter which models are currently exposed, then pick the strongest
   * model from our ordered policy. This avoids hard-coding a model that has
   * disappeared or changed availability.
   */
  async resolveBestModel(): Promise<string> {
    if (!window.puter?.ai) throw new Error('Puter.js is not loaded')
    const models = await window.puter.ai.listModels()
    const ids = new Set(models.map(model => model.id))
    const match = PUTER_MODEL_CANDIDATES.find(candidate => ids.has(candidate) || ids.has(candidate.replace(/^openai\//, '')))
    if (!match) throw new Error('No supported FrontendAI Puter model is currently available')
    this.resolvedModel = models.find(model => model.id === match)?.id ?? match
    return this.resolvedModel
  }

  /** Lightweight live probe. Uses Puter's test API so model selection can be verified without consuming normal usage. */
  async probeModel(model: string) {
    if (!window.puter?.ai) return { model, ok: false, error: 'Puter.js is not loaded' }
    try {
      const response = await window.puter.ai.chat('Reply with exactly: OK', true, {
        model,
        max_tokens: 8,
        temperature: 0,
      })
      const content = response?.message?.content ?? response?.content ?? response
      return { model, ok: Boolean(content), response: String(content ?? '') }
    } catch (error) {
      return { model, ok: false, error: error instanceof Error ? error.message : String(error) }
    }
  }

  async probeCandidates() {
    const results = []
    for (const candidate of PUTER_MODEL_CANDIDATES) {
      results.push(await this.probeModel(candidate))
      if (results.at(-1)?.ok) break
    }
    return results
  }

  async streamChat(
    messages: Message[],
    tools: ToolDefinition[],
    onChunk: (chunk: { text?: string; thought?: string; toolCall?: any; done?: boolean }) => void,
    opts?: { temperature?: number }
  ) {
    if (!window.puter?.ai) throw new Error('Puter.js is not loaded')
    const model = this.resolvedModel ?? await this.resolveBestModel()
    const response = await window.puter.ai.chat(
      messages.map(message => ({
        role: message.role,
        content: message.content,
        ...(message.toolCallId ? { tool_call_id: message.toolCallId } : {}),
        ...(message.toolCalls?.length ? { tool_calls: message.toolCalls } : {}),
      })),
      false,
      {
        model,
        stream: true,
        normalize: true,
        compaction: true,
        reasoning_effort: 'high',
        temperature: opts?.temperature ?? 0.2,
        tools: tools.map(tool => ({
          type: 'function',
          function: {
            name: tool.name,
            description: tool.description,
            parameters: tool.parameters,
            strict: true,
          },
        })),
      }
    )

    for await (const part of response as AsyncIterable<PuterChunk>) {
      if (part.type === 'text' && part.text) onChunk({ text: part.text })
      else if (part.type === 'tool_use') {
        onChunk({
          toolCall: {
            id: part.id,
            name: part.name,
            arguments: part.input ?? {},
          },
        })
      } else if (part.type === 'error') {
        throw new Error(part.text ?? 'Puter model stream failed')
      }
    }
    onChunk({ done: true })
  }
}

export const puterAdapter = new PuterAdapter()
