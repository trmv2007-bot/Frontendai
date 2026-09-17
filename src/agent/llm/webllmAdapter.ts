import type { LLMAdapter } from './adapter'
import type { Message, ToolDefinition } from '../types'

// Placeholder that will load @mlc-ai/web-llm dynamically
export class WebLLMAdapter implements LLMAdapter {
  name = 'webllm'
  private engine: any = null
  private modelId: string

  constructor(modelId = 'Llama-3.2-1B-Instruct-q4f32_1-MLC') {
    this.modelId = modelId
  }

  async isAvailable() {
    // @ts-ignore
    return typeof navigator !== 'undefined' && !!navigator.gpu
  }

  async init(onProgress?: (p: any) => void) {
    try {
      const { CreateMLCEngine } = await import('@mlc-ai/web-llm' as any)
      this.engine = await CreateMLCEngine(this.modelId, {
        initProgressCallback: onProgress
      })
      return true
    } catch (e) {
      console.warn('WebLLM init failed, falling back to mock', e)
      return false
    }
  }

  async streamChat(
    messages: Message[],
    _tools: ToolDefinition[],
    onChunk: (c: any) => void
  ) {
    if (!this.engine) {
      const ok = await this.init((p: any) => onChunk({ thought: `Loading ${this.modelId}: ${p.text}` }))
      if (!ok) {
        onChunk({ text: 'WebLLM not available (needs WebGPU). Switch to Mock or BYOK in settings.' })
        onChunk({ done: true })
        return
      }
    }

    const prompt = messages.map(m => `${m.role}: ${m.content}`).join('\n')

    try {
      const chunks = await this.engine.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        stream: true
      })
      for await (const chunk of chunks) {
        const text = chunk.choices[0]?.delta?.content
        if (text) onChunk({ text })
      }
    } catch (e: any) {
      onChunk({ text: `WebLLM error: ${e.message}` })
    }
    onChunk({ done: true })
  }
}
