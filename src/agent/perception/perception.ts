export interface PerceptionInput { text?: string; screenshot?: Blob; accessibilityTree?: unknown; structuredContext?: Record<string, unknown> }
export interface PerceptionResult { summary: string; targets: string[]; signals: Array<{ type: string; value: string; confidence: number }> }

export interface PerceptionProvider { perceive(input: PerceptionInput): Promise<PerceptionResult> }

export class StructuredPerception implements PerceptionProvider {
  async perceive(input: PerceptionInput): Promise<PerceptionResult> {
    const context = input.structuredContext ?? {}
    const targets = [context.selectedElement, context.currentRoute, context.activePanel].filter(Boolean).map(String)
    return { summary: input.text ? `User intent: ${input.text}` : 'Frontend environment observed', targets, signals: targets.map(value => ({ type: 'structured_target', value, confidence: 1 })) }
  }
}

export class CompositePerception implements PerceptionProvider {
  constructor(private providers: PerceptionProvider[]) {}
  async perceive(input: PerceptionInput): Promise<PerceptionResult> {
    const results = await Promise.all(this.providers.map(provider => provider.perceive(input)))
    return { summary: results.map(r => r.summary).filter(Boolean).join(' · '), targets: [...new Set(results.flatMap(r => r.targets))], signals: results.flatMap(r => r.signals) }
  }
}

export const perception = new CompositePerception([new StructuredPerception()])
