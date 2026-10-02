export type WorkerRole = 'researcher' | 'builder' | 'tester' | 'verifier' | 'specialist'

export interface WorkerDefinition {
  id: string
  role: WorkerRole
  capabilities: string[]
  run: (input: WorkerInput) => Promise<WorkerOutput>
}

export interface WorkerInput {
  objective: string
  context: Record<string, unknown>
  previous?: WorkerOutput[]
}

export interface WorkerOutput {
  workerId: string
  status: 'success' | 'failed'
  summary: string
  artifacts?: unknown[]
  followUp?: string[]
}

export interface OrchestrationResult {
  status: 'completed' | 'failed'
  outputs: WorkerOutput[]
  summary: string
}

export class AgentOrchestrator {
  private workers = new Map<string, WorkerDefinition>()

  register(worker: WorkerDefinition) {
    this.workers.set(worker.id, worker)
    return () => this.workers.delete(worker.id)
  }

  list() { return [...this.workers.values()].map(({ id, role, capabilities }) => ({ id, role, capabilities })) }

  async run(objective: string, context: Record<string, unknown> = {}, roles?: WorkerRole[]): Promise<OrchestrationResult> {
    const selected = [...this.workers.values()].filter(worker => !roles || roles.includes(worker.role))
    const outputs: WorkerOutput[] = []
    for (const worker of selected) {
      const output = await worker.run({ objective, context, previous: outputs })
      outputs.push(output)
      if (output.status === 'failed') break
    }
    const failed = outputs.find(output => output.status === 'failed')
    return {
      status: failed ? 'failed' : 'completed',
      outputs,
      summary: failed ? `Orchestration stopped at ${failed.workerId}: ${failed.summary}` : `Completed ${outputs.length} worker stages`,
    }
  }
}

export const agentOrchestrator = new AgentOrchestrator()
