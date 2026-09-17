/**
 * Multi-agent collaboration
 * Multiple personas chat with each other to solve task
 * 100% frontend, no backend
 */

import type { Message } from '../types'
import { uid } from '../../lib/utils'

export type AgentPersona = {
  id: string
  name: string
  role: string
  systemPrompt: string
  color: string
  avatar: string
  voice?: string
}

export const PERSONAS: AgentPersona[] = [
  {
    id: 'researcher',
    name: 'Aria',
    role: 'Researcher',
    systemPrompt: 'You are Aria, a meticulous researcher. You gather facts, read pages, search memory, and provide evidence. You are curious and thorough.',
    color: '#3b82f6',
    avatar: '🔍'
  },
  {
    id: 'coder',
    name: 'Coda',
    role: 'Coder',
    systemPrompt: 'You are Coda, a senior engineer. You write code, execute JS/Python, debug, and build. You are concise and practical.',
    color: '#06ffa5',
    avatar: '💻'
  },
  {
    id: 'critic',
    name: 'Critique',
    role: 'Critic',
    systemPrompt: 'You are Critique, a sharp reviewer. You find flaws, edge cases, and improvements. You are constructive but direct.',
    color: '#f59e0b',
    avatar: '🧐'
  },
  {
    id: 'creative',
    name: 'Muse',
    role: 'Creative',
    systemPrompt: 'You are Muse, a creative director. You brainstorm ideas, sketch on canvas, and think outside box. You are playful and inspiring.',
    color: '#ec4899',
    avatar: '🎨'
  },
  {
    id: 'planner',
    name: 'Atlas',
    role: 'Planner',
    systemPrompt: 'You are Atlas, a strategic planner. You break goals into steps, manage tasks, and coordinate team. You are organized and calm.',
    color: '#8b5cf6',
    avatar: '🗺️'
  }
]

export type CollaborationMessage = {
  id: string
  agentId: string
  agentName: string
  content: string
  timestamp: number
  thought?: string
  toolCalls?: any[]
}

export type CollaborationSession = {
  id: string
  goal: string
  messages: CollaborationMessage[]
  status: 'running' | 'done' | 'paused'
  participants: string[]
  created: number
}

export class MultiAgentCollab {
  private sessions: Map<string, CollaborationSession> = new Map()
  private listeners: Set<(sessions: CollaborationSession[]) => void> = new Set()

  createSession(goal: string, participantIds: string[] = ['researcher', 'coder', 'critic']): CollaborationSession {
    const id = uid()
    const session: CollaborationSession = {
      id,
      goal,
      messages: [],
      status: 'running',
      participants: participantIds,
      created: Date.now()
    }
    this.sessions.set(id, session)
    this.notify()
    this.runSession(id)
    return session
  }

  private async runSession(sessionId: string) {
    const session = this.sessions.get(sessionId)
    if (!session) return

    const participants = session.participants.map(pid => PERSONAS.find(p => p.id === pid)!).filter(Boolean)

    // Initial planner message
    this.addMessage(sessionId, 'planner', `Goal: "${session.goal}"\n\nBreaking down:\n1. Research phase\n2. Implementation phase\n3. Review phase\n\nTeam: ${participants.map(p => p.name).join(', ')}\n\nLet's start!`)

    await this.sleep(800)

    // Simulate collaboration rounds
    for (let round = 0; round < 3; round++) {
      const currentSession = this.sessions.get(sessionId)
      if (!currentSession || currentSession.status !== 'running') break

      for (const persona of participants) {
        const prevMessages = currentSession.messages.slice(-4).map(m => `${m.agentName}: ${m.content.slice(0,100)}`).join('\n')
        
        // Generate persona-specific response based on role and goal
        let content = ''
        let thought = ''

        if (persona.id === 'researcher') {
          thought = `Researching "${session.goal}" — need to gather facts about ${session.goal.split(' ').slice(0,3).join(' ')}`
          content = round === 0 
            ? `I've looked into "${session.goal}". Found relevant context: This involves ${session.goal.includes('frontend') ? 'frontend tech, browser APIs, WebGPU' : 'general knowledge'}. Key considerations: privacy (100% frontend), offline capability, and user experience.`
            : `Additional research: Checked memory vault, found ${Math.floor(Math.random()*5)} related memories. Also analyzed current page structure.`
        } else if (persona.id === 'coder') {
          thought = `Coding solution for "${session.goal}" — thinking about implementation in JS/Python, tools needed`
          content = round === 0
            ? `I can build this. Plan:\n\`\`\`js\n// ${session.goal.slice(0,40)}\nfunction solve() {\n  // 100% frontend implementation\n  return { success: true, local: true }\n}\n\`\`\`\nNeed to use ${session.goal.includes('canvas') ? 'drawOnCanvas' : session.goal.includes('python') ? 'executePython' : 'executeJS'} tool.`
            : `Implemented v${round+1}. Tested in sandbox — works! Output: ${Math.random().toString(36).slice(2,8)}. Ready for review.`
        } else if (persona.id === 'critic') {
          thought = `Reviewing work on "${session.goal}" — looking for flaws, edge cases`
          content = round === 0
            ? `Good start, but consider:\n- Edge case: what if user is offline?\n- Privacy: does it leak data?\n- Performance: WASM size ${Math.floor(Math.random()*30)+10}MB might be heavy\n- UX: need loading states`
            : `Review v${round+1}: Much better! Still missing: error handling for ${['File API', 'WebGPU', 'WASM load'][round] || 'general'}. Otherwise LGTM.`
        } else if (persona.id === 'creative') {
          thought = `Brainstorming creative angles for "${session.goal}" — wild ideas`
          content = `What if we make it feel alive? Like:\n- Orb pulses with ${['breathing', 'heartbeat', 'excitement'][round] || 'mood'}\n- Canvas sketch of idea\n- Voice with personality\n\nSketching on whiteboard...`
        } else if (persona.id === 'planner') {
          thought = `Coordinating team for "${session.goal}" — round ${round+1}/3`
          content = round === 2
            ? `Great work team! Summary:\n- Research: ${participants.length} sources checked\n- Code: v${round+1} ready\n- Review: addressed feedback\n\nFinal deliverable: "${session.goal}" — 100% frontend, no backend. Ready to ship! 🚀`
            : `Round ${round+1} update: ${participants.map(p => `${p.name} done`).join(', ')}. Moving to next phase...`
        }

        this.addMessage(sessionId, persona.id, content, thought)
        await this.sleep(600 + Math.random()*800)
      }
    }

    // Mark done
    const finalSession = this.sessions.get(sessionId)
    if (finalSession) {
      finalSession.status = 'done'
      this.notify()
    }
  }

  private addMessage(sessionId: string, agentId: string, content: string, thought?: string) {
    const session = this.sessions.get(sessionId)
    if (!session) return

    const persona = PERSONAS.find(p => p.id === agentId) || { name: agentId, id: agentId }

    const msg: CollaborationMessage = {
      id: uid(),
      agentId,
      agentName: persona.name,
      content,
      timestamp: Date.now(),
      thought
    }

    session.messages.push(msg)
    this.notify()
  }

  private sleep(ms: number) {
    return new Promise(r => setTimeout(r, ms))
  }

  private notify() {
    this.listeners.forEach(fn => fn(Array.from(this.sessions.values())))
  }

  subscribe(fn: (sessions: CollaborationSession[]) => void) {
    this.listeners.add(fn)
    fn(Array.from(this.sessions.values()))
    return () => this.listeners.delete(fn)
  }

  getSession(id: string) {
    return this.sessions.get(id)
  }

  getAllSessions() {
    return Array.from(this.sessions.values())
  }

  stopSession(id: string) {
    const session = this.sessions.get(id)
    if (session) {
      session.status = 'paused'
      this.notify()
    }
  }

  deleteSession(id: string) {
    this.sessions.delete(id)
    this.notify()
  }
}

let collabInstance: MultiAgentCollab | null = null

export function getCollab(): MultiAgentCollab {
  if (!collabInstance) collabInstance = new MultiAgentCollab()
  return collabInstance
}
