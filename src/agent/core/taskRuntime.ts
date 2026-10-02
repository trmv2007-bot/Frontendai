import { uid } from '../../lib/utils'
import { agentEventBus } from '../environment/eventBus'

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
    this.task = {
      id: uid(), objective, mode, status: 'planning',
      steps: steps.map(step => ({ ...step, id: uid(), status: 'pending' })),
      createdAt: now, updatedAt: now
    }
    agentEventBus.emit('task_started', { taskId: this.task.id, objective, mode }, 'agent')
    this.notify()
    return this.snapshot()
  }

  addStep(title: string, description?: string) {
    if (!this.task) return undefined
    const existing = this.task.steps.find(step => step.title === title && step.status === 'pending')
    if (existing) return existing.id
    const step: TaskStep = { id: uid(), title, description, status: 'pending' }
    this.task.steps.push(step)
    this.touch()
    return step.id
  }

  setPlan(steps: Array<Pick<TaskStep, 'title' | 'description'>>) {
    if (!this.task) return
    this.task.steps = steps.map(step => ({ ...step, id: uid(), status: 'pending' }))
    this.task.status = 'running'
    this.touch()
  }

  beginStep(stepId: string) {
    if (!this.task || this.task.status === 'stopped') return
    const step = this.task.steps.find(item => item.id === stepId)
    if (!step) return
    step.status = 'running'; step.startedAt = Date.now(); this.task.status = 'running'; this.touch()
  }

  completeStep(stepId: string, result?: unknown) {
    if (!this.task) return
    const step = this.task.steps.find(item => item.id === stepId)
    if (!step) return
    step.status = 'success'; step.result = result; step.completedAt = Date.now(); this.touch()
  }

  failStep(stepId: string, error: string) {
    if (!this.task) return
    const step = this.task.steps.find(item => item.id === stepId)
    if (!step) return
    step.status = 'error'; step.error = error; step.completedAt = Date.now(); this.task.status = 'failed'; this.touch()
  }

  pause() {
    if (!this.task || !['planning', 'running'].includes(this.task.status)) return
    this.task.status = 'paused'; this.touch()
    agentEventBus.emit('task_paused', { taskId: this.task.id }, 'agent')
  }

  resume() {
    if (!this.task || this.task.status !== 'paused') return
    this.task.status = 'running'; this.touch()
    agentEventBus.emit('task_resumed', { taskId: this.task.id }, 'agent')
  }

  stop() {
    if (!this.task || ['completed', 'stopped'].includes(this.task.status)) return
    this.task.status = 'stopped'; this.touch()
    agentEventBus.emit('task_stopped', { taskId: this.task.id }, 'agent')
  }

  complete() {
    if (!this.task) return
    this.task.status = 'completed'
    this.task.steps.forEach(step => { if (step.status === 'pending') step.status = 'skipped' })
    this.touch()
    agentEventBus.emit('task_completed', { taskId: this.task.id }, 'agent')
  }

  isPaused() { return this.task?.status === 'paused' }
  isStopped() { return this.task?.status === 'stopped' }
  getTask() { return this.task ? this.snapshot() : undefined }

  private touch() {
    if (!this.task) return
    this.task.updatedAt = Date.now(); this.notify()
  }

  private notify() {
    if (!this.task) return
    const snapshot = this.snapshot(); this.listeners.forEach(listener => listener(snapshot))
  }

  private snapshot(): AgentTask {
    return { ...this.task!, steps: this.task!.steps.map(step => ({ ...step })) }
  }
}

export const taskRuntime = new TaskRuntime()
