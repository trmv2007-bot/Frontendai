import { uid } from '../../lib/utils'
import { intentInterpreter } from '../core/intent'
import { verificationPipeline, type VerificationCheck, type VerificationReport } from '../core/verification'
import { perception, type PerceptionInput } from '../perception/perception'
import { createCapabilityRegistry, type AgentCapabilityManifest, type AgentGoal, type AgentOrchestrator, type VerificationResult } from './agentFuture'

interface GoalState extends AgentGoal { status: 'created' | 'planned' | 'running' | 'completed' | 'needs_repair'; steps: string[]; attempts: number }

export class FrontendAgentOrchestrator implements AgentOrchestrator {
  readonly capabilities = createCapabilityRegistry()
  private goals = new Map<string, GoalState>()

  registerCapability(manifest: AgentCapabilityManifest) { this.capabilities.register(manifest) }

  async createGoal(goal: AgentGoal) {
    const id = goal.id || uid()
    this.goals.set(id, { ...goal, id, status: 'created', steps: [], attempts: 0 })
    return id
  }

  async createFromIntent(input: string) {
    const intent = intentInterpreter.interpret(input)
    return this.createGoal({ id: uid(), objective: intent.objective, constraints: intent.constraints, successCriteria: intent.successCriteria })
  }

  async plan(goalId: string) {
    const goal = this.require(goalId)
    const verbs = goal.objective.match(/\\b(build|create|fix|debug|test|compare|analyze|design|plan|update|deploy|review)\\b/gi) ?? []
    goal.steps = ['Inspect the relevant frontend environment', verbs.length ? `Perform: ${verbs[0].toLowerCase()}` : 'Execute the requested objective', 'Verify the result']
    goal.status = 'planned'
    return [...goal.steps]
  }

  async execute(goalId: string) {
    const goal = this.require(goalId)
    if (!goal.steps.length) await this.plan(goalId)
    goal.status = 'running'
    goal.attempts++
    await perception.perceive({ text: goal.objective } satisfies PerceptionInput)
  }

  async verify(goalId: string): Promise<VerificationResult> {
    const goal = this.require(goalId)
    const checks: VerificationCheck[] = [
      { name: 'Goal has an execution plan', run: () => goal.steps.length > 0 },
      { name: 'Goal has success criteria', run: () => (goal.successCriteria?.length ?? 0) > 0 },
    ]
    const report: VerificationReport = await verificationPipeline.run(checks)
    if (report.passed) goal.status = 'completed'
    else goal.status = 'needs_repair'
    return { passed: report.passed, checks: report.checks, nextAction: report.next }
  }

  async replan(goalId: string, reason: string) {
    const goal = this.require(goalId)
    goal.status = 'created'
    goal.steps = [`Inspect failure: ${reason}`, 'Choose a corrective strategy', 'Execute corrective strategy', 'Verify the result']
    goal.attempts++
    return [...goal.steps]
  }

  getGoal(goalId: string) { const goal = this.goals.get(goalId); return goal ? { ...goal, steps: [...goal.steps] } : undefined }
  listGoals() { return [...this.goals.values()].map(goal => ({ ...goal, steps: [...goal.steps] })) }

  private require(id: string) { const goal = this.goals.get(id); if (!goal) throw new Error(`Unknown agent goal: ${id}`); return goal }
}

export const agentOrchestrator = new FrontendAgentOrchestrator()
