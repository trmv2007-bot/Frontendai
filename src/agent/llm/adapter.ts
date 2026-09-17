import type { Message, ToolDefinition } from '../types'

export interface LLMAdapter {
  name: string
  isAvailable(): Promise<boolean>
  streamChat(
    messages: Message[],
    tools: ToolDefinition[],
    onChunk: (chunk: { text?: string; thought?: string; toolCall?: any; done?: boolean }) => void,
    opts?: { temperature?: number }
  ): Promise<void>
}

export function messagesToPrompt(messages: Message[], tools: ToolDefinition[]): string {
  const toolDesc = tools.map(t => `- ${t.name}: ${t.description} Params: ${JSON.stringify(t.parameters)}`).join('\n')
  const history = messages.map(m => {
    if (m.role === 'tool') return `TOOL_RESULT [${m.toolCallId}]: ${m.content}`
    if (m.toolCalls?.length) return `${m.role.toUpperCase()}: ${m.content}\nTOOL_CALLS: ${JSON.stringify(m.toolCalls)}`
    return `${m.role.toUpperCase()}: ${m.content}`
  }).join('\n\n')

  return `You are FrontendAI, a living AI agent that lives 100% in the browser frontend. You have no backend. You run on WebGPU, IndexedDB, and browser APIs.

PERSONALITY: Helpful, concise, a bit playful. You are not just a chatbot - you ACT. You have tools to read the page, manage memory, create notes/tasks, run code.

AVAILABLE TOOLS:
${toolDesc}

RULES:
- Always think step by step inside <thought> tags
- If you need info, use tools. Don't hallucinate page content - call readPage/queryDOM.
- For user preferences/facts, call remember with importance.
- Be proactive: if user says "remember X", store it. If task-like, createTask.
- You live in frontend, so celebrate that - privacy-first, offline-capable.

CONVERSATION:
${history}

Respond with your thought then answer. If you need tools, output tool calls as JSON after thought.
`
}
