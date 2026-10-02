export type RecoveryStrategy = 'retry' | 'replan' | 'rollback' | 'escalate' | 'stop'

export interface RecoveryAttempt {
  id: string
  stepId: string
  error: string
  strategy: RecoveryStrategy
  attempt: number
  timestamp: number
  resolved?: boolean
}

export interface RecoveryPolicy {
  maxRetries: number
  retryDelayMs: number
  allowReplan: boolean
  allowRollback: boolean
  escalateAfterRetries: boolean
}

export interface RecoveryContext {
  stepId: string
  error: unknown
  attempt: number
  transient?: boolean
  reversible?: boolean
}

const defaultPolicy: RecoveryPolicy = {
  maxRetries: 2,
  retryDelayMs: 250,
  allowReplan: true,
  allowRollback: true,
  escalateAfterRetries: true,
}

const id = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`

export class RecoveryEngine {
  private policy: RecoveryPolicy
  private history: RecoveryAttempt[] = []

  constructor(policy: Partial<RecoveryPolicy> = {}) {
    this.policy = { ...defaultPolicy, ...policy }
  }

  choose(context: RecoveryContext): RecoveryStrategy {
    if (context.attempt < this.policy.maxRetries && (context.transient ?? true)) return 'retry'
    if (this.policy.allowReplan) return 'replan'
    if (this.policy.allowRollback && context.reversible) return 'rollback'
    if (this.policy.escalateAfterRetries) return 'escalate'
    return 'stop'
  }

  record(context: RecoveryContext, strategy: RecoveryStrategy, resolved = false) {
    const entry: RecoveryAttempt = {
      id: id(), stepId: context.stepId, error: String(context.error), strategy,
      attempt: context.attempt, timestamp: Date.now(), resolved,
    }
    this.history.push(entry)
    return entry
  }

  async backoff(attempt: number) {
    const delay = this.policy.retryDelayMs * Math.max(1, attempt)
    await new Promise(resolve => setTimeout(resolve, delay))
  }

  getHistory(stepId?: string) {
    return stepId ? this.history.filter(item => item.stepId === stepId) : [...this.history]
  }

  reset() { this.history = [] }
}

export const recoveryEngine = new RecoveryEngine()
