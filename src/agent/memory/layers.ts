import { db, pseudoEmbed, cosine } from './db'
import type { MemoryItem } from '../types'

export type MemoryLayer = 'short-term' | 'session' | 'project' | 'user' | 'tool'

export interface MemoryRecord extends MemoryItem {
  layer: MemoryLayer
  projectId?: string
}

export interface MemoryQuery {
  text: string
  layers?: MemoryLayer[]
  projectId?: string
  limit?: number
}

/**
 * Layered memory facade. Retrieval is relevance-first and bounded so the
 * model never receives the entire long-term store by default.
 */
export class MemoryLayers {
  private shortTerm: MemoryRecord[] = []
  private session: MemoryRecord[] = []

  push(layer: MemoryLayer, content: string, options: Partial<MemoryRecord> = {}) {
    const record: MemoryRecord = {
      id: options.id ?? crypto.randomUUID(),
      type: options.type ?? 'episodic',
      content,
      timestamp: options.timestamp ?? Date.now(),
      importance: options.importance ?? 0.5,
      tags: options.tags ?? [],
      source: options.source,
      embedding: options.embedding ?? pseudoEmbed(content),
      layer,
      projectId: options.projectId
    }

    if (layer === 'short-term') {
      this.shortTerm = [...this.shortTerm, record].slice(-12)
    } else if (layer === 'session') {
      this.session = [...this.session, record].slice(-50)
    }
    return record
  }

  async persist(record: MemoryRecord) {
    await db.memories.put(record)
    return record
  }

  async remember(layer: MemoryLayer, content: string, options: Partial<MemoryRecord> = {}) {
    const record = this.push(layer, content, options)
    if (layer !== 'short-term' && layer !== 'session') await this.persist(record)
    return record
  }

  async retrieve(query: MemoryQuery) {
    const limit = query.limit ?? 8
    const allowed = new Set(query.layers ?? ['short-term', 'session', 'project', 'user', 'tool'])
    const local = [...this.shortTerm, ...this.session].filter(item => allowed.has(item.layer))
    const persistent = await db.memories.toArray() as MemoryRecord[]
    const candidates = [...local, ...persistent].filter(item => {
      if (!allowed.has(item.layer)) return false
      if (query.projectId && item.projectId && item.projectId !== query.projectId) return false
      return true
    })

    const embedding = pseudoEmbed(query.text)
    return candidates
      .map(item => ({ item, score: cosine(embedding, item.embedding ?? []) * 0.8 + item.importance * 0.2 }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(({ item, score }) => ({ ...item, score }))
  }

  getImmediate() {
    return [...this.shortTerm, ...this.session].sort((a, b) => b.timestamp - a.timestamp)
  }

  clearSession() {
    this.shortTerm = []
    this.session = []
  }
}

export const memoryLayers = new MemoryLayers()
