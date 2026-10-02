export type AgentEventType =
  | 'route_changed'
  | 'element_selected'
  | 'panel_opened'
  | 'panel_closed'
  | 'user_clicked'
  | 'form_updated'
  | 'file_changed'
  | 'build_started'
  | 'build_failed'
  | 'build_completed'
  | 'error_detected'
  | 'action_started'
  | 'action_completed'
  | 'action_failed'
  | 'task_started'
  | 'task_paused'
  | 'task_resumed'
  | 'task_completed'
  | 'task_stopped'

export interface AgentEvent<T = unknown> {
  id: string
  type: AgentEventType
  timestamp: number
  source: string
  payload?: T
}

export interface EnvironmentContext {
  route: string
  page?: string
  activeProject?: string
  selectedElement?: string
  openPanels: string[]
  recentActions: AgentEvent[]
  activeTask?: {
    id: string
    objective: string
    status: 'planning' | 'running' | 'paused' | 'completed' | 'stopped' | 'failed'
  }
  availableActions: string[]
  relevantState: Record<string, unknown>
  updatedAt: number
}

export interface ContextProvider {
  id: string
  priority?: number
  getContext: () => Partial<EnvironmentContext> | Promise<Partial<EnvironmentContext>>
}
