import type { LLMAdapter } from './adapter'
import type { Message, ToolDefinition } from '../types'

export class OpenAIAdapter implements LLMAdapter {
  name = 'openai'
  private config: { apiKey: string, model: string, baseUrl?: string }
  constructor(config: { apiKey: string, model: string, baseUrl?: string }) {
    this.config = config
  }

  async isAvailable() { return !!this.config.apiKey }

  async streamChat(
    messages: Message[],
    tools: ToolDefinition[],
    onChunk: (c: any) => void
  ) {
    const url = (this.config.baseUrl || 'https://api.openai.com/v1') + '/chat/completions'
    
    const body = {
      model: this.config.model,
      messages: messages.map(m => ({
        role: m.role === 'tool' ? 'tool' : m.role,
        content: m.content,
        tool_call_id: m.toolCallId,
        tool_calls: m.toolCalls?.map(tc => ({
          id: tc.id,
          type: 'function',
          function: { name: tc.name, arguments: JSON.stringify(tc.arguments) }
        }))
      })),
      tools: tools.map(t => ({
        type: 'function',
        function: {
          name: t.name,
          description: t.description,
          parameters: t.parameters
        }
      })),
      stream: true,
      temperature: 0.7
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify(body)
    })

    if (!res.ok) {
      const txt = await res.text()
      onChunk({ text: `Error: ${txt}` })
      onChunk({ done: true })
      return
    }

    const reader = res.body!.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const data = line.slice(6)
        if (data === '[DONE]') { onChunk({ done: true }); return }
        try {
          const json = JSON.parse(data)
          const delta = json.choices?.[0]?.delta
          if (delta?.content) onChunk({ text: delta.content })
          if (delta?.tool_calls) {
            for (const tc of delta.tool_calls) {
              onChunk({ toolCall: tc })
            }
          }
        } catch {}
      }
    }
    onChunk({ done: true })
  }
}
