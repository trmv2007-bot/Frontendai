import { useEffect } from 'react'
import { contextEngine } from '../agent/environment/contextEngine'
import { agentEventBus } from '../agent/environment/eventBus'

export function useEnvironmentBridge() {
  useEffect(() => {
    const providerId = 'browser-environment'
    const unregister = contextEngine.registerProvider({
      id: providerId,
      priority: 10,
      getContext: () => ({
        route: window.location.pathname,
        page: document.title || undefined,
        relevantState: {
          viewport: { width: window.innerWidth, height: window.innerHeight },
          visibility: document.visibilityState
        }
      })
    })

    let lastPath = window.location.pathname
    const emitRoute = () => {
      const path = window.location.pathname
      if (path !== lastPath) {
        lastPath = path
        agentEventBus.emit('route_changed', { from: lastPath, to: path }, 'browser')
      }
      contextEngine.setContext({ route: path, page: document.title || undefined })
    }

    const onPopState = emitRoute
    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null
      if (!target) return
      const interactive = target.closest('button,a,[role="button"],input,textarea,select') as HTMLElement | null
      if (!interactive) return
      agentEventBus.emit('user_clicked', {
        tag: interactive.tagName.toLowerCase(),
        role: interactive.getAttribute('role'),
        label: (interactive.getAttribute('aria-label') || interactive.textContent || '').trim().slice(0, 160)
      }, 'browser')
    }

    window.addEventListener('popstate', onPopState)
    document.addEventListener('click', onClick, true)
    document.addEventListener('visibilitychange', emitRoute)
    emitRoute()

    return () => {
      unregister()
      window.removeEventListener('popstate', onPopState)
      document.removeEventListener('click', onClick, true)
      document.removeEventListener('visibilitychange', emitRoute)
    }
  }, [])
}
