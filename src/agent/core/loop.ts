import type { Message, ToolDefinition, AgentState } from '../types'
import type { LLMAdapter } from '../llm/adapter'
import { TOOL_EXECUTORS } from '../tools/executors'
import { uid } from '../../lib/utils'

export class AgentLoop {
  messages: Message[] = []
  state: AgentState
  private adapter: LLMAdapter
  private tools: ToolDefinition[]
  private listeners: Set<(s: AgentState) => void> = new Set()
  private msgListeners: Set<(msgs: Message[]) => void> = new Set()

  constructor(adapter: LLMAdapter, tools: ToolDefinition[]) {
    this.adapter = adapter
    this.tools = tools
    this.state = {
      status: 'idle',
      autonomy: (parseInt(localStorage.getItem('frontendai_autonomy') || '2') as any) || 2,
      memoryCount: 0,
      isOnline: true
    }
  }

  subscribeState(fn: (s: AgentState) => void) {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  subscribeMessages(fn: (msgs: Message[]) => void) {
    this.msgListeners.add(fn)
    return () => this.msgListeners.delete(fn)
  }

  private setState(patch: Partial<AgentState>) {
    this.state = { ...this.state, ...patch }
    this.listeners.forEach(l => l(this.state))
  }

  private setMessages(msgs: Message[]) {
    this.messages = msgs
    this.msgListeners.forEach(l => l(msgs))
  }

  async sendUserMessage(content: string) {
    const userMsg: Message = { id: uid(), role: 'user', content, timestamp: Date.now() }
    const newMsgs = [...this.messages, userMsg]
    this.setMessages(newMsgs)
    await this.runLoop(newMsgs)
  }

  async runLoop(messages: Message[]) {
    this.setState({ status: 'thinking', currentThought: 'Analyzing request...' })

    const assistantMsg: Message = {
      id: uid(),
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      isStreaming: true,
      thought: '',
      toolCalls: []
    }

    this.setMessages([...messages, assistantMsg])

    let fullText = ''
    let fullThought = ''
    let pendingToolCalls: any[] = []

    await this.adapter.streamChat(messages, this.tools, async (chunk) => {
      if (chunk.thought) {
        fullThought += chunk.thought + '\n'
        assistantMsg.thought = fullThought
        this.setState({ currentThought: chunk.thought })
        this.setMessages([...messages, { ...assistantMsg }])
      }
      if (chunk.text) {
        fullText += chunk.text
        assistantMsg.content = fullText
        this.setState({ status: 'thinking' })
        this.setMessages([...messages, { ...assistantMsg }])
      }
      if (chunk.toolCall) {
        const existing = pendingToolCalls.find(t => t.id === chunk.toolCall.id)
        if (existing) {
          Object.assign(existing, chunk.toolCall)
        } else {
          pendingToolCalls.push({
            id: chunk.toolCall.id || uid(),
            name: chunk.toolCall.name || chunk.toolCall.function?.name,
            arguments: chunk.toolCall.arguments || JSON.parse(chunk.toolCall.function?.arguments || '{}'),
            status: 'running' as const
          })
        }
        assistantMsg.toolCalls = [...pendingToolCalls]
        this.setState({ status: 'acting', currentTool: pendingToolCalls[pendingToolCalls.length-1]?.name })
        this.setMessages([...messages, { ...assistantMsg }])
      }
      if (chunk.done) {
        assistantMsg.isStreaming = false
        // Execute tool calls if they have results already from mock adapter they are done
        // For real adapters, we need to execute
        const needsExecution = pendingToolCalls.filter(tc => !tc.result && tc.status === 'running')
        if (needsExecution.length && this.adapter.name !== 'mock') {
          for (const tc of needsExecution) {
            tc.status = 'running'
            this.setMessages([...messages, { ...assistantMsg }])
            try {
              const exec = TOOL_EXECUTORS[tc.name]
              if (exec) {
                const res = await exec(tc.arguments)
                tc.result = res
                tc.status = 'success'
                tc.duration = 100
                // Add tool result message
                const toolMsg: Message = {
                  id: uid(),
                  role: 'tool',
                  content: JSON.stringify(res).slice(0,4000),
                  timestamp: Date.now(),
                  toolCallId: tc.id
                }
                messages = [...messages, assistantMsg, toolMsg]
                this.setMessages(messages)
                // Continue loop with tool result
                await this.runLoop(messages)
                return
              } else {
                tc.status = 'error'
                tc.result = { error: 'Tool not found' }
              }
            } catch (e:any) {
              tc.status = 'error'
              tc.result = { error: e.message }
            }
          }
        }

        this.setMessages([...messages, { ...assistantMsg, isStreaming: false }])
        this.setState({ status: 'idle', currentThought: undefined, currentTool: undefined })
      }
    })
  }

  clear() {
    this.setMessages([])
  }

  setAdapter(adapter: LLMAdapter) {
    this.adapter = adapter
  }
}
