import type { Message, ToolDefinition, AgentState } from '../types'
import type { LLMAdapter } from '../llm/adapter'
import { uid } from '../../lib/utils'
import type { ContextEngine } from '../environment/contextEngine'
import { agentEventBus } from '../environment/eventBus'
import { taskRuntime, type TaskMode } from './taskRuntime'
import { activityTimeline } from './activity'
import { actionRegistry } from '../tools/registry'
import { memoryLayers } from '../memory/layers'

export class AgentLoop {
  messages: Message[] = []
  state: AgentState
  private adapter: LLMAdapter
  private tools: ToolDefinition[]
  private contextEngine?: ContextEngine
  private listeners: Set<(s: AgentState) => void> = new Set()
  private msgListeners: Set<(msgs: Message[]) => void> = new Set()
  private taskUnsubscribe: () => void

  constructor(adapter: LLMAdapter, tools: ToolDefinition[], contextEngine?: ContextEngine) {
    this.adapter = adapter; this.tools = tools; this.contextEngine = contextEngine
    this.state = { status: 'idle', autonomy: (parseInt(localStorage.getItem('frontendai_autonomy') || '2') as any) || 2, memoryCount: 0, isOnline: true }
    this.taskUnsubscribe = taskRuntime.subscribe(task => {
      this.setState({ taskId: task.id, taskStatus: task.status, taskMode: task.mode, status: task.status === 'paused' ? 'paused' : this.state.status })
      this.contextEngine?.setContext({ activeTask: { id: task.id, objective: task.objective, status: task.status } })
    })
  }

  subscribeState(fn: (s: AgentState) => void) { this.listeners.add(fn); fn(this.state); return () => this.listeners.delete(fn) }
  subscribeMessages(fn: (msgs: Message[]) => void) { this.msgListeners.add(fn); fn(this.messages); return () => this.msgListeners.delete(fn) }
  private setState(patch: Partial<AgentState>) { this.state = { ...this.state, ...patch }; this.listeners.forEach(l => l(this.state)) }
  private setMessages(msgs: Message[]) { this.messages = msgs; this.msgListeners.forEach(l => l(msgs)) }

  private async buildModelMessages(messages: Message[]) {
    if (!this.contextEngine) return messages
    const context = await this.contextEngine.refresh()
    const objective = taskRuntime.getTask()?.objective || messages.filter(m => m.role === 'user').at(-1)?.content || ''
    const memories = objective ? await memoryLayers.retrieve({ text: objective, limit: 6 }) : []
    const contextMessage: Message = {
      id: `environment-${context.updatedAt}`, role: 'system', timestamp: context.updatedAt,
      content: `FRONTEND ENVIRONMENT CONTEXT:\n${JSON.stringify({ route: context.route, page: context.page, activeProject: context.activeProject, selectedElement: context.selectedElement, openPanels: context.openPanels, activeTask: context.activeTask, availableActions: context.availableActions, recentActions: context.recentActions.slice(-8), relevantState: context.relevantState })}\n\nRELEVANT MEMORY:\n${JSON.stringify(memories.map(memory => ({ layer: memory.layer, type: memory.type, content: memory.content, score: memory.score })))}`
    }
    return [contextMessage, ...messages]
  }

  private availableTools() {
    const registered = actionRegistry.availableForEnvironment()
    return registered.length ? registered : this.tools
  }

  async sendUserMessage(content: string, mode: TaskMode = this.state.autonomy >= 3 ? 'autonomous' : 'assist') {
    taskRuntime.start(content, mode)
    await memoryLayers.remember('short-term', `User task: ${content}`, { importance: 0.8, source: 'agent-task' })
    const userMsg: Message = { id: uid(), role: 'user', content, timestamp: Date.now() }
    const newMsgs = [...this.messages, userMsg]; this.setMessages(newMsgs); await this.runLoop(newMsgs)
  }
  pause() { taskRuntime.pause(); this.setState({ status: 'paused' }) }
  resume() { taskRuntime.resume(); if (taskRuntime.getTask()?.status === 'running') this.setState({ status: 'thinking' }) }
  stop() { taskRuntime.stop(); this.setState({ status: 'idle', currentThought: undefined, currentTool: undefined }) }
  getTask() { return taskRuntime.getTask() }

  async runLoop(messages: Message[]) {
    if (taskRuntime.isStopped()) return
    while (taskRuntime.isPaused()) { await new Promise(resolve => setTimeout(resolve, 100)); if (taskRuntime.isStopped()) return }
    this.setState({ status: 'thinking', currentThought: 'Analyzing request and application state...' })
    const assistantMsg: Message = { id: uid(), role: 'assistant', content: '', timestamp: Date.now(), isStreaming: true, thought: '', toolCalls: [] }
    this.setMessages([...messages, assistantMsg])
    let fullText = ''; let fullThought = ''; const pendingToolCalls: any[] = []
    const modelMessages = await this.buildModelMessages(messages)
    const availableTools = this.availableTools()

    await this.adapter.streamChat(modelMessages, availableTools, async (chunk) => {
      if (taskRuntime.isStopped()) return
      while (taskRuntime.isPaused() && !taskRuntime.isStopped()) await new Promise(resolve => setTimeout(resolve, 100))
      if (chunk.thought) { fullThought += chunk.thought + '\n'; assistantMsg.thought = fullThought; this.setState({ currentThought: chunk.thought, status: 'thinking' }); this.setMessages([...messages, { ...assistantMsg }]) }
      if (chunk.text) { fullText += chunk.text; assistantMsg.content = fullText; this.setState({ status: 'thinking' }); this.setMessages([...messages, { ...assistantMsg }]) }
      if (chunk.toolCall) {
        const existing = pendingToolCalls.find(t => t.id === chunk.toolCall.id)
        if (existing) Object.assign(existing, chunk.toolCall)
        else pendingToolCalls.push({ id: chunk.toolCall.id || uid(), name: chunk.toolCall.name || chunk.toolCall.function?.name, arguments: chunk.toolCall.arguments || JSON.parse(chunk.toolCall.function?.arguments || '{}'), status: 'running' as const })
        assistantMsg.toolCalls = [...pendingToolCalls]; this.setState({ status: 'acting', currentTool: pendingToolCalls[pendingToolCalls.length - 1]?.name }); this.setMessages([...messages, { ...assistantMsg }])
      }
      if (chunk.done) {
        assistantMsg.isStreaming = false
        const needsExecution = pendingToolCalls.filter(tc => !tc.result && tc.status === 'running')
        if (needsExecution.length && this.adapter.name !== 'mock') {
          for (const tc of needsExecution) {
            if (taskRuntime.isStopped()) return
            while (taskRuntime.isPaused() && !taskRuntime.isStopped()) await new Promise(resolve => setTimeout(resolve, 100))
            const action = actionRegistry.get(tc.name)
            if (!action) {
              tc.status = 'error'; tc.result = { error: `Unknown action: ${tc.name}` }
              continue
            }
            const stepId = taskRuntime.addStep(tc.name, action.description)
            const activityId = activityTimeline.start(`Running ${tc.name}`, 'Executing application action', stepId)
            if (stepId) taskRuntime.beginStep(stepId)
            agentEventBus.emit('action_started', { taskId: taskRuntime.getTask()?.id, tool: tc.name, arguments: tc.arguments }, 'agent')
            try {
              const startedAt = Date.now(); const res = await actionRegistry.execute(tc.name, tc.arguments)
              tc.result = res; tc.status = 'success'; tc.duration = Date.now() - startedAt
              activityTimeline.finish(activityId, 'success'); if (stepId) taskRuntime.completeStep(stepId, res)
              agentEventBus.emit('action_completed', { taskId: taskRuntime.getTask()?.id, tool: tc.name, result: res }, 'agent')
              const toolMsg: Message = { id: uid(), role: 'tool', content: JSON.stringify(res).slice(0, 4000), timestamp: Date.now(), toolCallId: tc.id }
              messages = [...messages, assistantMsg, toolMsg]; this.setMessages(messages); this.setState({ status: 'observing', currentTool: tc.name })
              await this.runLoop(messages); return
            } catch (e: any) {
              tc.status = 'error'; tc.result = { error: e.message }; activityTimeline.finish(activityId, 'error', e.message); if (stepId) taskRuntime.failStep(stepId, e.message)
              agentEventBus.emit('action_failed', { taskId: taskRuntime.getTask()?.id, tool: tc.name, error: e.message }, 'agent')
              const toolMsg: Message = { id: uid(), role: 'tool', content: JSON.stringify({ error: e.message }), timestamp: Date.now(), toolCallId: tc.id }
              messages = [...messages, assistantMsg, toolMsg]
            }
          }
          if (messages.length > this.messages.length) { this.setMessages(messages); this.setState({ status: 'observing' }); await this.runLoop(messages); return }
        }
        this.setMessages([...messages, { ...assistantMsg, isStreaming: false }])
        if (taskRuntime.getTask()?.status === 'running') taskRuntime.complete()
        this.setState({ status: 'idle', currentThought: undefined, currentTool: undefined })
      }
    })
  }

  clear() { this.setMessages([]) }
  setAdapter(adapter: LLMAdapter) { this.adapter = adapter }
  destroy() { this.taskUnsubscribe() }
}