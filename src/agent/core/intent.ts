export interface Intent { objective: string; constraints: string[]; successCriteria: string[]; confidence: number }
export interface IntentInterpreter { interpret(input: string): Intent }

const actionWords = /\b(build|create|fix|debug|test|compare|analyze|design|plan|update|deploy|review)\b/i

export class DefaultIntentInterpreter implements IntentInterpreter {
  interpret(input: string): Intent {
    const objective = input.trim()
    const constraints: string[] = []
    const successCriteria = ['The requested objective is completed', 'The result is verified']
    if (/without|only|must|should/i.test(input)) constraints.push(input.match(/(?:without|only|must|should)\b.*$/i)?.[0] ?? '')
    const confidence = actionWords.test(input) ? 0.9 : objective.length > 8 ? 0.7 : 0.4
    return { objective, constraints: constraints.filter(Boolean), successCriteria, confidence }
  }
}

export const intentInterpreter = new DefaultIntentInterpreter()
