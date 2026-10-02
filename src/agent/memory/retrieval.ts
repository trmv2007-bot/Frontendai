import type { MemoryItem } from '../types'

export interface MemoryQuery {
  text?: string
  tags?: string[]
  types?: MemoryItem['type'][]
  limit?: number
  minImportance?: number
}

const tokenize = (value: string) => new Set(value.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean))

const lexicalScore = (query: string, content: string) => {
  const q = tokenize(query)
  const c = tokenize(content)
  if (!q.size || !c.size) return 0
  let hits = 0
  q.forEach(token => { if (c.has(token)) hits += 1 })
  return hits / q.size
}

export interface RankedMemory extends MemoryItem { score: number }

export class MemoryRetriever {
  retrieve(items: MemoryItem[], query: MemoryQuery): RankedMemory[] {
    const text = query.text ?? ''
    const tags = new Set((query.tags ?? []).map(tag => tag.toLowerCase()))
    return items
      .filter(item => !query.types?.length || query.types.includes(item.type))
      .filter(item => item.importance >= (query.minImportance ?? 0))
      .map(item => {
        const tagScore = tags.size ? [...tags].filter(tag => item.tags.some(itemTag => itemTag.toLowerCase() === tag)).length / tags.size : 0
        const recency = Math.max(0, 1 - (Date.now() - item.timestamp) / (1000 * 60 * 60 * 24 * 30))
        const score = (text ? lexicalScore(text, item.content) * 0.55 : 0) + tagScore * 0.25 + item.importance * 0.15 + recency * 0.05
        return { ...item, score }
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, query.limit ?? 8)
  }
}

export const memoryRetriever = new MemoryRetriever()
