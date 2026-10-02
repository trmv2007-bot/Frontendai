export interface AgentCapabilityContext {
  route?: string
  projectId?: string
  taskId?: string
  selectedNodeId?: string
  state: Record<string, unknown>
}

export interface AgentCapability {
  id: string
  version: string
  description: string
  tools?: string[]
  events?: string[]
  permissions?: string[]
  context?: (input: AgentCapabilityContext) => Record<string, unknown>
  dispose?: () => void
}

export class CapabilityRegistry {
  private capabilities = new Map<string, AgentCapability>()

  register(capability: AgentCapability) {
    if (this.capabilities.has(capability.id)) throw new Error(`Agent capability already registered: ${capability.id}`)
    this.capabilities.set(capability.id, capability)
    return () => { capability.dispose?.(); this.capabilities.delete(capability.id) }
  }

  get(id: string) { return this.capabilities.get(id) }
  list() { return [...this.capabilities.values()].map(({ context: _context, dispose: _dispose, ...publicInfo }) => publicInfo) }

  collectContext(input: AgentCapabilityContext) {
    return [...this.capabilities.values()].reduce<Record<string, unknown>>((result, capability) => {
      if (capability.context) result[capability.id] = capability.context(input)
      return result
    }, {})
  }
}

export const capabilityRegistry = new CapabilityRegistry()

export const defineCapability = (capability: AgentCapability) => capabilityRegistry.register(capability)
