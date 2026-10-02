import { useEffect } from 'react'
import { contextEngine } from '../agent/environment/contextEngine'
import { agentEventBus } from '../agent/environment/eventBus'

function describeElement(element: Element | null) {
  if (!(element instanceof HTMLElement)) return undefined
  const id = element.id ? `#${element.id}` : ''
  const classes = typeof element.className === 'string' ? element.className.split(/\s+/).filter(Boolean).slice(0, 3).map(c => `.${c}`).join('') : ''
  return `${element.tagName.toLowerCase()}${id}${classes}`
}

export function useEnvironmentBridge() {
  useEffect(() => {
    const unregister = contextEngine.registerProvider({
      id: 'browser-environment',
      priority: 10,
      getContext: () => ({
        route: window.location.pathname,
        page: document.title || undefined,
        relevantState: {
          viewport: { width: window.innerWidth, height: window.innerHeight },
          visibility: document.visibilityState,
          url: window.location.href
        }
      })
    })

    let lastPath = window.location.pathname
    const emitRoute = () => {
      const path = window.location.pathname
      if (path !== lastPath) {
        const from = lastPath
        lastPath = path
        agentEventBus.emit('route_changed', { from, to: path }, 'browser')
      }
      contextEngine.setContext({ route: path, page: document.title || undefined })
    }

    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null
      const interactive = target?.closest('button,a,[role="button"],input,textarea,select') as HTMLElement | null
      if (!interactive) return
      agentEventBus.emit('user_clicked', {
        element: describeElement(interactive),
        tag: interactive.tagName.toLowerCase(),
        role: interactive.getAttribute('role'),
        label: (interactive.getAttribute('aria-label') || interactive.textContent || '').trim().slice(0, 160)
      }, 'browser')
    }

    const onFocus = (event: FocusEvent) => {
      const target = event.target as HTMLElement | null
      if (!target || !['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return
      contextEngine.setContext({ selectedElement: describeElement(target) })
    }

    const onInput = (event: Event) => {
      const target = event.target as HTMLElement | null
      if (!target) return
      agentEventBus.emit('form_updated', {
        element: describeElement(target),
        valueType: target instanceof HTMLInputElement ? target.type : target.tagName.toLowerCase()
      }, 'browser')
    }

    window.addEventListener('popstate', emitRoute)
    document.addEventListener('click', onClick, true)
    document.addEventListener('focusin', onFocus, true)
    document.addEventListener('input', onInput, true)
    document.addEventListener('visibilitychange', emitRoute)
    emitRoute()

    return () => {
      unregister()
      window.removeEventListener('popstate', emitRoute)
      document.removeEventListener('click', onClick, true)
      document.removeEventListener('focusin', onFocus, true)
      document.removeEventListener('input', onInput, true)
      document.removeEventListener('visibilitychange', emitRoute)
    }
  }, [])
}
