import Dexie, { type Table } from 'dexie'
import type { MemoryItem, Note, Task, Message } from '../types'

class FrontendAIDB extends Dexie {
  memories!: Table<MemoryItem>
  notes!: Table<Note>
  tasks!: Table<Task>
  messages!: Table<Message>

  constructor() {
    super('FrontendAI_OS')
    this.version(1).stores({
      memories: 'id, type, timestamp, importance',
      notes: 'id, updated, created',
      tasks: 'id, created, completed',
      messages: 'id, timestamp, role'
    })
  }
}

export const db = new FrontendAIDB()

// simple embedding: hash-based pseudo embedding for offline demo
// real impl would use transformers.js
export function pseudoEmbed(text: string, dim = 64): number[] {
  const vec = new Array(dim).fill(0)
  const words = text.toLowerCase().split(/\W+/).filter(Boolean)
  for (let i = 0; i < words.length; i++) {
    const w = words[i]
    let h = 0
    for (let j = 0; j < w.length; j++) h = (h * 31 + w.charCodeAt(j)) >>> 0
    vec[h % dim] += 1
    vec[(h * 7) % dim] += 0.5
  }
  // normalize
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1
  return vec.map(v => v / norm)
}

export function cosine(a: number[], b: number[]): number {
  let dot = 0
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i]
  return dot
}
