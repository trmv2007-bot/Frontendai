import { uid } from '../../lib/utils'
import { agentEventBus } from '../environment/eventBus'
import { contextEngine } from '../environment/contextEngine'
import { agentPresence } from './presence'
import { recoveryEngine } from './recovery'
import { taskReplay } from './replay'

export type TaskMode = 'assist' | 'autonomous'
export type TaskStatus = 'planning' | 'running' | 'paused' | 'completed' | 'stopped' | 'failed'
export type StepStatus = 'pending' | 'running' | 'success' | 'error' | 'skipped'

export interface TaskStep {
  id: string
  title: string
  description?: string
  status: StepStatus
  startedAt?: number
  completedAt?: number
  error?: string
  result?: unknown
}

export interface AgentTask {
  id: string
  objective: string
  mode: TaskMode
  status: TaskStatus
  steps: TaskStep[]
  createdAt: number
  updatedAt: number
}

export type TaskListener = (task: AgentTask) => void
const terminalStatuses = new Set<TaskStatus>(['completed', 'stopped', 'failed'])

export class TaskRuntime {
  private task?: AgentTask
  private listeners = new Set<TaskListener>()

  subscribe(listener: TaskListener) {
    this.listeners.add(listener)
    if (this.task) listener(this.snapshot())
    return () => this.listeners.delete(listener)
  }

  start(objective: string, mode: TaskMode = 'assist', steps: Array<Pick<TaskStep, 'title' | 'description'>> = []) {
    const now = Date.now()
    this.task = { id: uid(), objective, mode, status: 'planning', steps: steps.map(step => ({ ...step, id: uid(), status: 'pending' })), createdAt: now, updatedAt: now }
    taskReplay.append(this.task.id, 'task', 'Task started', objective, { mode })
    agentPresence.transition('observing')
    this.syncContext()
    agentEventBus.emit('task_started', { taskId: this.task.id, objective, mode }, 'agent')
    this.notify()
    return this.snapshot()
  }

  addStep(title: string, description?: string) {
    if (!this.task || terminalStatuses.has(this.task.status)) return undefined
    const existing = this.task.steps.find(step => step.title === title && step.status === 'pending')
    if (existing) return existing.id
    const step: TaskStep = { id: uid(), title, description, status: 'pending' }
    this.task.steps.push(step)
    taskReplay.append(this.task.id, 'plan', `Added step: ${title}`, description)
    this.touch()
    return step.id
  }

  setPlan(steps: Array<Pick<TaskStep, 'title' | 'description'>>) {
    if (!this.task || terminalStatuses.has(this.task.status)) return
    this.task.steps = steps.map(step => ({ ...step, id: uid(), status: 'pending' }))
    this.task.status = steps.length ? 'running' : 'completed'
    taskReplay.append(this.task.id, 'plan', 'Plan updated', `${steps.length} steps`)
    agentPresence.transition(steps.length ? 'working' : 'completed')
    this.touch()
    if (!steps.length) agentEventBus.emit('task_completed', { taskId: this.task.id }, 'agent')
  }

  beginStep(stepId: string) {
    if (!this.task || terminalStatuses.has(this.task.status) || this.task.status === 'paused') return
    const step = this.task.steps.find(item => item.id === stepId)
    if (!step || step.status !== 'pending') return
    step.status = 'running'
    step.startedAt = Date.now()
    this.task.status = 'running'
    taskReplay.append(this.task.id, 'tool', `Working: ${step.title}`, step.description, { stepId })
    if (agentPresence.getState() !== 'working') agentPresence.transition('working')
    this.touch()
  }

  completeStep(stepId: string, result?: unknown) {
    if (!this.task || terminalStatuses.has(this.task.status) || this.task.status === 'paused') return
    const step = this.task.steps.find(item => item.id === stepId)
    if (!step || step.status !== 'running') return
    step.status = 'success'
    step.result = result
    step.completedAt = Date.now()
    taskReplay.append(this.task.id, 'observation', `Verified: ${step.title}`, undefined, { stepId })
    this.touch()
    if (this.task.steps.length > 0 && this.task.steps.every(item => ['success', 'skipped'].includes(item.status))) this.complete()
  }

  failStep(stepId: string, error: string, options: { transient?: boolean; reversible?: boolean } = {}) {
    if (!this.task || terminalStatuses.has(this.task.status)) return undefined
    const step = this.task.steps.find(item => item.id === stepId)
    if (!step || step.status !== 'running') return undefined
    const attempt = recoveryEngine.getHistory(stepId).length + 1
    const strategy = recoveryEngine.choose({ stepId, error, attempt, ...options })
    recoveryEngine.record({ stepId, error, attempt, ...options }, strategy)
    taskReplay.append(this.task.id, 'error', `Step failed: ${step.title}`, error, { stepId, strategy, attempt })
    if (strategy === 'retry' || strategy === 'replan') {
      step.status = 'pending'
      step.error = error
      this.task.status = 'running'
      agentPresence.transition(strategy === 'retry' ? 'working' : 'planning')
      this.touch()
      return strategy
    }
    step.status = 'error'
    step.error = error
    step.completedAt = Date.now()
    this.task.status = strategy === 'stop' ? 'failed' : 'paused'
    agentPresence.transition(strategy === 'escalate' ? 'waiting' : 'error')
    this.touch()
    return strategy
  }

  pause() {
    if (!this.task || !['planning', 'running'].includes(this.task.status)) return
    this.task.status = 'paused'
    taskReplay.append(this.task.id, 'user', 'Task paused')
    this.touch()
    agentPresence.transition('paused')
    agentEventBus.emit('task_paused', { taskId: this.task.id }, 'agent')
  }

  resume() {
    if (!this.task || this.task.status !== 'paused') return
    this.task.status = 'running'
    taskReplay.append(this.task.id, 'user', 'Task resumed')
    this.touch()
    agentPresence.transition('working')
    agentEventBus.emit('task_resumed', { taskId: this.task.id }, 'agent')
  }

  stop() {
    if (!this.task || terminalStatuses.has(this.task.status)) return
    this.task.status = 'stopped'
    taskReplay.append(this.task.id, 'user', 'Task stopped')
    this.touch()
    agentPresence.transition('idle')
    agentEventBus.emit('task_stopped', { taskId: this.task.id }, 'agent')
  }

  complete() {
    if (!this.task || terminalStatuses.has(this.task.status)) return
    this.task.status = 'completed'
    this.task.steps.forEach(step => { if (step.status === 'pending') step.status = 'skipped' })
    taskReplay.append(this.task.id, 'task', 'Task completed')
    this.touch()
    agentPresence.transition('completed')
    agentEventBus.emit('task_completed', { taskId: this.task.id }, 'agent')
  }

  isPaused() { return this.task?.status === 'paused' }
  isStopped() { return this.task?.status === 'stopped' }
  getTask() { return this.task ? this.snapshot() : undefined }

  private touch() {
    if (!this.task) return
    this.task.updatedAt = Date.now()
    this.syncContext()
    this.notify()
  }

  private syncContext() {
    if (!this.task) return
    const task = this.snapshot()
    contextEngine.setContext({ activeTask: { id: task.id, objective: task.objective, status: task.status }, relevantState: { ...contextEngine.getContext().relevantState, activeTask: task } })
  }

  private notify() {
    if (!this.task) return
    const snapshot = this.snapshot()
    this.listeners.forEach(listener => listener(snapshot))
  }

  private snapshot(): AgentTask {
    return { ...this.task!, steps: this.task!.steps.map(step => ({ ...step })) }
  }
}

export const taskRuntime = new TaskRuntime()
