export type WorkspaceKind = 'debug' | 'compare' | 'plan' | 'research' | 'review' | 'test' | 'custom'

export interface WorkspacePanel {
  id: string
  title: string
  component: string
  data?: Record<string, unknown>
}

export interface TaskWorkspace {
  id: string
  taskId: string
  kind: WorkspaceKind
  title: string
  panels: WorkspacePanel[]
  createdAt: number
  updatedAt: number
}

const id = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`

export class TaskWorkspaceRegistry {
  private workspaces = new Map<string, TaskWorkspace>()

  create(taskId: string, kind: WorkspaceKind, title: string, panels: Omit<WorkspacePanel, 'id'>[] = []) {
    const workspace: TaskWorkspace = {
      id: id(), taskId, kind, title,
      panels: panels.map(panel => ({ ...panel, id: id() })),
      createdAt: Date.now(), updatedAt: Date.now(),
    }
    this.workspaces.set(workspace.id, workspace)
    return this.snapshot(workspace)
  }

  addPanel(workspaceId: string, panel: Omit<WorkspacePanel, 'id'>) {
    const workspace = this.workspaces.get(workspaceId)
    if (!workspace) throw new Error(`Unknown task workspace: ${workspaceId}`)
    workspace.panels.push({ ...panel, id: id() })
    workspace.updatedAt = Date.now()
    return this.snapshot(workspace)
  }

  get(workspaceId: string) { const item = this.workspaces.get(workspaceId); return item ? this.snapshot(item) : undefined }
  forTask(taskId: string) { return [...this.workspaces.values()].filter(item => item.taskId === taskId).map(item => this.snapshot(item)) }
  remove(workspaceId: string) { return this.workspaces.delete(workspaceId) }

  private snapshot(workspace: TaskWorkspace): TaskWorkspace {
    return { ...workspace, panels: workspace.panels.map(panel => ({ ...panel })) }
  }
}

export const taskWorkspaces = new TaskWorkspaceRegistry()
