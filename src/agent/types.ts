export type Role = 'user' | 'assistant' | 'system' | 'tool'

export interface Message {
  id: string
  role: Role
  content: string
  timestamp: number
  toolCalls?: ToolCall[]
  toolCallId?: string
  thought?: string
  isStreaming?: boolean
}

export interface ToolCall {
  id: string
  name: string
  arguments: Record<string, any>
  result?: any
  status: 'pending' | 'running' | 'success' | 'error'
  duration?: number
}

export interface ToolDefinition {
  name: string
  description: string
  parameters: {
    type: 'object'
    properties: Record<string, { type: string; description: string; enum?: string[] }>
    required?: string[]
  }
  category: 'page' | 'productivity' | 'memory' | 'system' | 'code' | 'agent'
  icon: string
  needsConfirmation?: boolean
}

export type AgentStatus = 'idle' | 'thinking' | 'acting' | 'observing' | 'sleeping' | 'error'

export type AutonomyLevel = 0 | 1 | 2 | 3 // 0=ask always, 1=confirm risky, 2=auto safe, 3=full auto

export interface AgentState {
  status: AgentStatus
  currentThought?: string
  currentTool?: string
  autonomy: AutonomyLevel
  memoryCount: number
  isOnline: boolean
}

export interface MemoryItem {
  id: string
  type: 'episodic' | 'semantic' | 'procedural' | 'fact'
  content: string
  embedding?: number[]
  timestamp: number
  importance: number
  tags: string[]
  source?: string
}

export interface Note {
  id: string
  title: string
  content: string
  created: number
  updated: number
  tags: string[]
}

export interface Task {
  id: string
  title: string
  completed: boolean
  created: number
  priority: 'low' | 'med' | 'high'
  due?: number
}

export type LLMProvider = 'mock' | 'webllm' | 'transformers' | 'openai' | 'anthropic' | 'groq' | 'ollama' | 'openrouter'

export interface LLMConfig {
  provider: LLMProvider
  model: string
  apiKey?: string
  baseUrl?: string
  temperature: number
  maxTokens: number
}

export interface Persona {
  id: string
  name: string
  avatar: string
  systemPrompt: string
  voice: 'default' | 'whisper' | 'energetic'
  color: string
}
