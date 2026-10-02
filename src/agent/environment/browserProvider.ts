import { contextEngine } from './contextEngine'
import { agentEventBus } from './eventBus'

let installed = false
let cleanup: (() => void) | undefined

/** Installs low-noise browser observations into the environment.
 * It deliberately records semantic navigation/visibility events, not every DOM mutation.
 */
export function installBrowserEnvironment() {
  if (installed || typeof window === 'undefined') return cleanup
  installed = true

  const emitRoute = () => agentEventBus.emit('route_changed', { path: window.location.pathname, search: window.location.search }, 'browser')
  const onVisibility = () => {
    contextEngine.setContext({ relevantState: { ...contextEngine.getContext().relevantState, documentVisible: document.visibilityState === 'visible' } })
  }
  const onError = (event: ErrorEvent) => {
    agentEventBus.emit('error_detected', { message: event.message, source: event.filename, line: event.lineno }, 'browser')
  }

  window.addEventListener('popstate', emitRoute)
  document.addEventListener('visibilitychange', onVisibility)
  window.addEventListener('error', onError)
  emitRoute()
  onVisibility()

  cleanup = () => {
    window.removeEventListener('popstate', emitRoute)
    document.removeEventListener('visibilitychange', onVisibility)
    window.removeEventListener('error', onError)
    installed = false
    cleanup = undefined
  }
  return cleanup
}

export function installBrowserContextProvider() {
  const unregister = contextEngine.registerProvider({
    id: 'browser-environment',
    priority: -10,
    getContext: () => ({
      route: typeof window === 'undefined' ? '/' : window.location.pathname,
      page: typeof document === 'undefined' ? undefined : document.title,
      relevantState: typeof document === 'undefined' ? {} : {
        documentVisible: document.visibilityState === 'visible',
        online: typeof navigator !== 'undefined' ? navigator.onLine : true
      }
    })
  })
  installBrowserEnvironment()
  return () => {
    unregister()
    cleanup?.()
  }
}
