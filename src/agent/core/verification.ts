export interface VerificationCheck { name: string; run: () => boolean | Promise<boolean>; detail?: string }
export interface VerificationReport { passed: boolean; checks: Array<{ name: string; passed: boolean; detail?: string }>; next: 'complete' | 'repair' | 'replan' | 'ask_user' }

export class VerificationPipeline {
  async run(checks: VerificationCheck[]): Promise<VerificationReport> {
    const results: VerificationReport['checks'] = []
    for (const check of checks) {
      try {
        const passed = await check.run()
        results.push({ name: check.name, passed, detail: check.detail })
      } catch (error) {
        results.push({ name: check.name, passed: false, detail: error instanceof Error ? error.message : String(error) })
      }
    }
    const failed = results.filter(result => !result.passed)
    return { passed: failed.length === 0, checks: results, next: failed.length === 0 ? 'complete' : 'repair' }
  }
}

export const verificationPipeline = new VerificationPipeline()
