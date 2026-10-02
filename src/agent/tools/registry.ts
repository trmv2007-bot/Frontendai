import type { ToolDefinition } from '../types'
import { TOOL_EXECUTORS } from './executors'
import { contextEngine } from '../environment/contextEngine'

export interface RegisteredAction extends ToolDefinition {
  execute: (input: Record<string, any>) => Promise<unknown> | unknown
  isAvailable?: () => boolean
  validate?: (input: Record<string, any>) => string | null
}

export class ActionRegistry {
  private actions = new Map<string, RegisteredAction>()

  register(action: RegisteredAction) {
    this.actions.set(action.name, action)
    return () => this.actions.delete(action.name)
  }

  registerTool(definition: ToolDefinition, executor?: (input: Record<string, any>) => Promise<unknown> | unknown) {
    const execute = executor ?? TOOL_EXECUTORS[definition.name]
    if (!execute) return () => false
    return this.register({ ...definition, execute })
  }

  unregister(name: string) {
    return this.actions.delete(name)
  }

  get(name: string) {
    return this.actions.get(name)
  }

  discover() {
    return [...this.actions.values()]
      .filter(action => !action.isAvailable || action.isAvailable())
      .map(({ execute: _execute, isAvailable: _available, validate: _validate, ...definition }) => definition)
  }

  async execute(name: string, input: Record<string, any>) {
    const action = this.actions.get(name)
    if (!action) throw new Error(`Unknown action: ${name}`)
    if (action.isAvailable && !action.isAvailable()) throw new Error(`Action unavailable: ${name}`)
    const validation = action.validate?.(input)
    if (validation) throw new Error(validation)
    return action.execute(input)
  }

  availableForEnvironment() {
    const context = contextEngine.getContext()
    const available = new Set(context.availableActions)
    return this.discover().filter(action => available.size === 0 || available.has(action.name))
  }
}

export const actionRegistry = new ActionRegistry()
