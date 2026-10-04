import { uid } from '../../lib/utils'
import { intentInterpreter } from '../core/intent'
import { verificationPipeline, type VerificationCheck, type VerificationReport } from '../core/verification'
import { perception, type PerceptionInput } from '../perception/perception'
import { taskWorkspaces, type WorkspaceKind } from '../workspaces/taskWorkspace'
import { createCapabilityRegistry, type AgentCapabilityManifest, type AgentGoal, type AgentOrchestrator, type VerificationResult } from './agentFuture'

interface GoalState extends AgentGoal { status: 'created' | 'planned' | 'running' | 'completed' | 'needs_repair'; steps: string[]; attempts: number; workspaceId?: string }

const workspaceFor = (objective: string): WorkspaceKind => {
  const text = objective.toLowerCase()
  if (/debug|error|bug|fix/.test(text)) return 'debug'
  if (/compare|versus|vs\b/.test(text)) return 'compare'
  if (/test|verify/.test(text)) return 'test'
  if (/research|investigate|analy[sz]e/.test(text)) return 'research'
  if (/review/.test(text)) return 'review'
  if (/plan|roadmap/.test(text)) return 'plan'
  return 'custom'
}

export class FrontendAgentOrchestrator implements AgentOrchestrator {
  readonly capabilities = createCapabilityRegistry()
  private goals = new Map<string, GoalState>()

  registerCapability(manifest: AgentCapabilityManifest) { this.capabilities.register(manifest) }

  async createGoal(goal: AgentGoal) {
    const id = goal.id || uid()
    const kind = workspaceFor(goal.objective)
    const workspace = taskWorkspaces.create(id, kind, `${kind[0].toUpperCase()}${kind.slice(1)} Workspace`, [
      { title: 'Objective', component: 'objective', data: { objective: goal.objective, constraints: goal.constraints ?? [] } },
      { title: 'Plan', component: 'plan', data: { steps: [] } },
      { title: 'Verification', component: 'verification', data: { checks: [] } },
    ])
    this.goals.set(id, { ...goal, id, status: 'created', steps: [], attempts: 0, workspaceId: workspace.id })
    return id
  }

  async createFromIntent(input: string) {
    const intent = intentInterpreter.interpret(input)
    return this.createGoal({ id: uid(), objective: intent.objective, constraints: intent.constraints, successCriteria: intent.successCriteria })
  }

  async plan(goalId: string) {
    const goal = this.require(goalId)
    const verbs = goal.objective.match(/\b(build|create|fix|debug|test|compare|analyze|design|plan|update|deploy|review)\b/gi) ?? []
    const primaryVerb = verbs[0]
    goal.steps = [
      'Inspect the relevant frontend environment',
      primaryVerb ? `Perform: ${primaryVerb.toLowerCase()}` : 'Execute the requested objective',
      'Verify the result',
    ]
    goal.status = 'planned'
    if (goal.workspaceId) {
      const workspace = taskWorkspaces.get(goal.workspaceId)
      if (workspace) taskWorkspaces.addPanel(goal.workspaceId, { title: 'Current Plan', component: 'plan', data: { steps: goal.steps } })
    }
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
      { name: 'Goal has success criteria', run: () => Boolean(goal.successCriteria?.length) },
      { name: 'Goal has completed execution', run: () => goal.status === 'running' || goal.status === 'completed' },
    ]
    const report: VerificationReport = await verificationPipeline.run(checks)
    if (report.passed) goal.status = 'completed'
    else goal.status = 'needs_repair'
    if (goal.workspaceId) {
      const workspace = taskWorkspaces.get(goal.workspaceId)
      if (workspace) taskWorkspaces.addPanel(goal.workspaceId, { title: report.passed ? 'Verification Passed' : 'Verification Failed', component: 'verification', data: { report } })
    }
    return { passed: report.passed, checks: report.checks, nextAction: report.next }
  }

  async replan(goalId: string, reason: string) {
    const goal = this.require(goalId)
    goal.status = 'created'
    goal.steps = [`Inspect failure: ${reason}`, 'Choose a corrective strategy', 'Execute corrective strategy', 'Verify the result']
    goal.attempts++
    if (goal.workspaceId) taskWorkspaces.addPanel(goal.workspaceId, { title: 'Recovery Plan', component: 'repair', data: { reason, steps: goal.steps, attempt: goal.attempts } })
    return [...goal.steps]
  }

  getGoal(goalId: string) { const goal = this.goals.get(goalId); return goal ? { ...goal, steps: [...goal.steps] } : undefined }
  listGoals() { return [...this.goals.values()].map(goal => ({ ...goal, steps: [...goal.steps] })) }
  getWorkspace(goalId: string) { const goal = this.goals.get(goalId); return goal?.workspaceId ? taskWorkspaces.get(goal.workspaceId) : undefined }

  private require(id: string) { const goal = this.goals.get(id); if (!goal) throw new Error(`Unknown agent goal: ${id}`); return goal }
}

export const agentOrchestrator = new FrontendAgentOrchestrator()
