import type { AgentEvent } from '../environment/types'

export interface TaskCheckpoint {
  taskId: string
  stepId: string
  createdAt: number
  contextVersion: number
  completedSteps: string[]
  eventIds: string[]
}

export class TaskCheckpointStore {
  private checkpoints = new Map<string, TaskCheckpoint>()

  save(checkpoint: TaskCheckpoint) {
    this.checkpoints.set(checkpoint.taskId, { ...checkpoint, completedSteps: [...checkpoint.completedSteps], eventIds: [...checkpoint.eventIds] })
    return checkpoint
  }

  get(taskId: string) {
    const checkpoint = this.checkpoints.get(taskId)
    return checkpoint ? { ...checkpoint, completedSteps: [...checkpoint.completedSteps], eventIds: [...checkpoint.eventIds] } : undefined
  }

  recordEvent(taskId: string, event: AgentEvent) {
    const checkpoint = this.checkpoints.get(taskId)
    if (!checkpoint) return
    checkpoint.eventIds.push(event.id)
    checkpoint.contextVersion += 1
  }

  clear(taskId: string) {
    this.checkpoints.delete(taskId)
  }
}

export const taskCheckpointStore = new TaskCheckpointStore()
