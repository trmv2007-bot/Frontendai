export type ReplayKind = 'task' | 'plan' | 'tool' | 'observation' | 'decision' | 'error' | 'checkpoint' | 'user'

export interface ReplayEvent {
  id: string
  taskId: string
  kind: ReplayKind
  label: string
  detail?: string
  timestamp: number
  metadata?: Record<string, unknown>
}

const id = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`

export class TaskReplay {
  private events = new Map<string, ReplayEvent[]>()

  append(taskId: string, kind: ReplayKind, label: string, detail?: string, metadata?: Record<string, unknown>) {
    const event: ReplayEvent = { id: id(), taskId, kind, label, detail, timestamp: Date.now(), metadata }
    const list = this.events.get(taskId) ?? []
    list.push(event)
    this.events.set(taskId, list)
    return event
  }

  list(taskId: string) { return [...(this.events.get(taskId) ?? [])] }

  range(taskId: string, from: number, to: number) {
    return this.list(taskId).filter(event => event.timestamp >= from && event.timestamp <= to)
  }

  export(taskId: string) {
    return JSON.stringify({ version: 1, taskId, events: this.list(taskId) })
  }

  clear(taskId?: string) {
    if (taskId) this.events.delete(taskId)
    else this.events.clear()
  }
}

export const taskReplay = new TaskReplay()
