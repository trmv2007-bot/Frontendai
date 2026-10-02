import type { ContextProvider, EnvironmentContext, AgentEvent } from './types'
import { agentEventBus } from './eventBus'

const emptyContext = (): EnvironmentContext => ({
  route: typeof window !== 'undefined' ? window.location.pathname : '/',
  openPanels: [],
  recentActions: [],
  availableActions: [],
  relevantState: {},
  updatedAt: Date.now()
})

export class ContextEngine {
  private context: EnvironmentContext = emptyContext()
  private providers = new Map<string, ContextProvider>()
  private listeners = new Set<(context: EnvironmentContext) => void>()
  private historyLimit = 20
  private unsubscribe?: () => void

  constructor() {
    this.unsubscribe = agentEventBus.on('*', event => this.recordEvent(event))
  }

  registerProvider(provider: ContextProvider) {
    this.providers.set(provider.id, provider)
    return () => this.providers.delete(provider.id)
  }

  subscribe(listener: (context: EnvironmentContext) => void) {
    this.listeners.add(listener)
    listener(this.getContext())
    return () => this.listeners.delete(listener)
  }

  private recordEvent(event: AgentEvent) {
    const recentActions = [...this.context.recentActions, event].slice(-this.historyLimit)
    this.context = { ...this.context, recentActions, updatedAt: Date.now() }
    this.listeners.forEach(listener => listener(this.getContext()))
  }

  async refresh() {
    const patches = await Promise.all(
      [...this.providers.values()]
        .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))
        .map(provider => provider.getContext())
    )

    this.context = patches.reduce<EnvironmentContext>(
      (current, patch) => ({ ...current, ...patch }),
      { ...this.context, updatedAt: Date.now() }
    )
    this.listeners.forEach(listener => listener(this.getContext()))
    return this.getContext()
  }

  setContext(patch: Partial<EnvironmentContext>) {
    this.context = { ...this.context, ...patch, updatedAt: Date.now() }
    this.listeners.forEach(listener => listener(this.getContext()))
  }

  getContext(): EnvironmentContext {
    return {
      ...this.context,
      openPanels: [...this.context.openPanels],
      recentActions: [...this.context.recentActions],
      availableActions: [...this.context.availableActions],
      relevantState: { ...this.context.relevantState }
    }
  }

  getRelevantContext(keys: Array<keyof EnvironmentContext>): Partial<EnvironmentContext> {
    const context = this.getContext()
    return keys.reduce<Record<string, unknown>>((result, key) => {
      result[key] = context[key]
      return result
    }, {}) as Partial<EnvironmentContext>
  }

  destroy() {
    this.unsubscribe?.()
    this.listeners.clear()
    this.providers.clear()
  }
}

export const contextEngine = new ContextEngine()
