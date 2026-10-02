export interface StructuredPerception {
  route?: string
  visibleElements?: Array<{ id: string; role?: string; label?: string; bounds?: { x: number; y: number; width: number; height: number } }>
  selectedElement?: string
  panels?: string[]
  state?: Record<string, unknown>
}

export interface VisionInput {
  image?: Blob | string
  prompt?: string
}

export interface VisionObservation {
  summary: string
  regions?: Array<{ label: string; confidence?: number; bounds?: { x: number; y: number; width: number; height: number } }>
  issues?: string[]
}

export interface VisionProvider {
  observe(input: VisionInput): Promise<VisionObservation>
}

export interface MultimodalObservation {
  structured: StructuredPerception
  visual?: VisionObservation
  timestamp: number
}

export class PerceptionEngine {
  private vision?: VisionProvider

  setVisionProvider(provider?: VisionProvider) { this.vision = provider }

  async observe(structured: StructuredPerception, visual?: VisionInput): Promise<MultimodalObservation> {
    const visualObservation = visual && this.vision ? await this.vision.observe(visual) : undefined
    return { structured, visual: visualObservation, timestamp: Date.now() }
  }
}

export const perceptionEngine = new PerceptionEngine()
