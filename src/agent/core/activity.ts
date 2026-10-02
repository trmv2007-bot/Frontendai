import { uid } from '../../lib/utils'

export type ActivityStatus = 'running' | 'success' | 'warning' | 'error' | 'paused'

export interface AgentActivity {
  id: string
  title: string
  detail?: string
  status: ActivityStatus
  timestamp: number
  duration?: number
  stepId?: string
}

export class ActivityTimeline {
  private items: AgentActivity[] = []
  private listeners = new Set<(items: AgentActivity[]) => void>()

  subscribe(listener: (items: AgentActivity[]) => void) {
    this.listeners.add(listener)
    listener(this.getItems())
    return () => this.listeners.delete(listener)
  }

  start(title: string, detail?: string, stepId?: string) {
    const item: AgentActivity = { id: uid(), title, detail, status: 'running', timestamp: Date.now(), stepId }
    this.items = [...this.items, item]
    this.notify()
    return item.id
  }

  finish(id: string, status: Exclude<ActivityStatus, 'running'> = 'success', detail?: string) {
    const item = this.items.find(entry => entry.id === id)
    if (!item) return
    item.status = status
    item.duration = Math.max(0, Date.now() - item.timestamp)
    if (detail !== undefined) item.detail = detail
    this.notify()
  }

  clear() {
    this.items = []
    this.notify()
  }

  getItems() {
    return this.items.map(item => ({ ...item }))
  }

  private notify() {
    const snapshot = this.getItems()
    this.listeners.forEach(listener => listener(snapshot))
  }
}

export const activityTimeline = new ActivityTimeline()
