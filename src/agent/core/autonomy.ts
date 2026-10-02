import type { AutonomyLevel } from '../types'
import { permissionGate, type ActionRisk } from './permissions'

export interface AutonomyPolicy {
  level: AutonomyLevel
  allowedRisks: ActionRisk[]
  requireApprovalForExternalEffects: boolean
  maxStepsPerTask: number
}

const defaults: AutonomyPolicy = {
  level: 2,
  allowedRisks: ['safe', 'mutating'],
  requireApprovalForExternalEffects: true,
  maxStepsPerTask: 100,
}

export class AutonomyController {
  private policy: AutonomyPolicy = { ...defaults }
  private approvals = new Set<string>()

  getPolicy() { return { ...this.policy, allowedRisks: [...this.policy.allowedRisks] } }

  configure(patch: Partial<AutonomyPolicy>) {
    this.policy = { ...this.policy, ...patch, allowedRisks: patch.allowedRisks ? [...patch.allowedRisks] : this.policy.allowedRisks }
    return this.getPolicy()
  }

  approve(actionId: string) { this.approvals.add(actionId) }
  revoke(actionId: string) { this.approvals.delete(actionId) }

  canExecute(actionId: string, risk: ActionRisk, externalEffect = false) {
    if (!this.policy.allowedRisks.includes(risk)) return this.approvals.has(actionId)
    if (permissionGate.requiresConfirmation(actionId, risk)) return this.approvals.has(actionId)
    if (externalEffect && this.policy.requireApprovalForExternalEffects) return this.approvals.has(actionId)
    return true
  }
}

export const autonomyController = new AutonomyController()
