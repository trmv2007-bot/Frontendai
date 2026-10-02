export type CapabilityKind = 'intent' | 'perception' | 'tool' | 'workspace' | 'memory' | 'agent'

export interface AgentCapabilityManifest {
  id: string
  name: string
  kind: CapabilityKind
  description: string
  permissions?: string[]
  dependencies?: string[]
  version?: string
}

export interface AgentGoal {
  id: string
  objective: string
  constraints?: string[]
  successCriteria?: string[]
}

export interface VerificationResult {
  passed: boolean
  checks: Array<{ name: string; passed: boolean; detail?: string }>
  nextAction?: 'complete' | 'repair' | 'replan' | 'ask_user'
}

export interface AgentOrchestrator {
  createGoal(goal: AgentGoal): Promise<string>
  plan(goalId: string): Promise<string[]>
  execute(goalId: string): Promise<void>
  verify(goalId: string): Promise<VerificationResult>
  replan(goalId: string, reason: string): Promise<string[]>
}

export interface AgentCapabilityRegistry {
  register(manifest: AgentCapabilityManifest): void
  list(kind?: CapabilityKind): AgentCapabilityManifest[]
  get(id: string): AgentCapabilityManifest | undefined
}

export function createCapabilityRegistry(): AgentCapabilityRegistry {
  const capabilities = new Map<string, AgentCapabilityManifest>()
  return {
    register(manifest) { capabilities.set(manifest.id, manifest) },
    list(kind) { return [...capabilities.values()].filter(item => !kind || item.kind === kind) },
    get(id) { return capabilities.get(id) }
  }
}
