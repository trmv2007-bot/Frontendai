import type { AgentEvent, AgentEventType } from './types'
import { uid } from '../../lib/utils'

type Listener = (event: AgentEvent) => void

export class AgentEventBus {
  private listeners = new Map<AgentEventType | '*', Set<Listener>>()

  on(type: AgentEventType | '*', listener: Listener) {
    const set = this.listeners.get(type) ?? new Set<Listener>()
    set.add(listener)
    this.listeners.set(type, set)
    return () => set.delete(listener)
  }

  emit<T = unknown>(type: AgentEventType, payload?: T, source = 'application') {
    const event: AgentEvent<T> = { id: uid(), type, timestamp: Date.now(), source, payload }
    this.listeners.get(type)?.forEach(listener => listener(event))
    this.listeners.get('*')?.forEach(listener => listener(event))
    return event
  }

  clear() {
    this.listeners.clear()
  }
}

export const agentEventBus = new AgentEventBus()
