import { useEffect, useState } from 'react'
import { contextEngine } from './contextEngine'
import { agentEventBus } from './eventBus'
import type { AgentEvent, EnvironmentContext } from './types'

export function useEnvironmentContext() {
  const [context, setContext] = useState<EnvironmentContext>(() => contextEngine.getContext())

  useEffect(() => {
    const refresh = () => setContext(contextEngine.getContext())
    const unsubscribe = agentEventBus.subscribe(() => refresh())
    refresh()
    return unsubscribe
  }, [])

  return context
}

export function emitEnvironmentEvent<T>(type: AgentEvent['type'], payload?: T, source = 'frontend') {
  return agentEventBus.emit({ type, source, payload })
}
