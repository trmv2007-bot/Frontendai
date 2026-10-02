export type PresenceState = 'idle' | 'observing' | 'thinking' | 'planning' | 'working' | 'verifying' | 'waiting' | 'paused' | 'completed' | 'error'

const transitions: Record<PresenceState, PresenceState[]> = {
  idle: ['observing', 'thinking', 'waiting'],
  observing: ['thinking', 'planning', 'paused', 'error'],
  thinking: ['planning', 'working', 'waiting', 'paused', 'error'],
  planning: ['working', 'waiting', 'paused', 'error'],
  working: ['observing', 'verifying', 'waiting', 'paused', 'completed', 'error'],
  verifying: ['working', 'completed', 'error', 'waiting'],
  waiting: ['thinking', 'working', 'paused', 'completed', 'error'],
  paused: ['thinking', 'working', 'idle', 'waiting'],
  completed: ['idle', 'observing', 'thinking'],
  error: ['thinking', 'planning', 'idle', 'paused'],
}

export class AgentPresence {
  private state: PresenceState = 'idle'
  private listeners = new Set<(state: PresenceState) => void>()

  getState() { return this.state }

  transition(next: PresenceState) {
    if (next === this.state) return true
    if (!transitions[this.state].includes(next)) throw new Error(`Invalid agent presence transition: ${this.state} → ${next}`)
    this.state = next
    this.listeners.forEach(listener => listener(next))
    return true
  }

  subscribe(listener: (state: PresenceState) => void) {
    this.listeners.add(listener)
    listener(this.state)
    return () => this.listeners.delete(listener)
  }

  reset() { this.state = 'idle'; this.listeners.forEach(listener => listener(this.state)) }
}

export const agentPresence = new AgentPresence()
