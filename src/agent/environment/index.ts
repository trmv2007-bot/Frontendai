export * from './types'
export * from './eventBus'
export * from './contextEngine'

import type { ToolDefinition } from '../types'
import type { AgentEvent } from './types'
import { agentEventBus } from './eventBus'

export interface EnvironmentTool {
  definition: ToolDefinition
  available?: () => boolean | Promise<boolean>
  execute: (args: Record<string, unknown>) => unknown | Promise<unknown>
}

export class EnvironmentToolRegistry {
  private tools = new Map<string, EnvironmentTool>()

  register(tool: EnvironmentTool) {
    this.tools.set(tool.definition.name, tool)
    return () => this.tools.delete(tool.definition.name)
  }

  async discover(): Promise<ToolDefinition[]> {
    const result: ToolDefinition[] = []
    for (const tool of this.tools.values()) {
      if (tool.available && !(await tool.available())) continue
      result.push(tool.definition)
    }
    return result
  }

  async execute(name: string, args: Record<string, unknown>) {
    const tool = this.tools.get(name)
    if (!tool) throw new Error(`Environment tool not found: ${name}`)
    if (tool.available && !(await tool.available())) throw new Error(`Environment tool unavailable: ${name}`)
    const started = Date.now()
    try {
      const result = await tool.execute(args)
      agentEventBus.emit('user_clicked', { tool: name, duration: Date.now() - started, result }, 'agent')
      return result
    } catch (error) {
      agentEventBus.emit('error_detected', { tool: name, error: error instanceof Error ? error.message : String(error) }, 'agent')
      throw error
    }
  }

  has(name: string) {
    return this.tools.has(name)
  }
}

export const environmentTools = new EnvironmentToolRegistry()

export const emitAgentEvent = (event: Omit<AgentEvent, 'id' | 'timestamp'>) =>
  agentEventBus.emit(event.type, event.payload, event.source)
