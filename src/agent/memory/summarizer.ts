/**
 * Auto-memory summarization
 * Periodically summarizes old chats into long-term memories
 * Runs 100% frontend, uses LLM adapter or local heuristics
 */

import { db } from './db'
import { embed } from './embeddings'
import type { Message, MemoryItem } from '../types'
import { uid } from '../../lib/utils'

export type SummarizerConfig = {
  enabled: boolean
  intervalMs: number
  maxMessagesBeforeSummary: number
  minImportance: number
}

const DEFAULT_CONFIG: SummarizerConfig = {
  enabled: true,
  intervalMs: 60000 * 5, // 5 min
  maxMessagesBeforeSummary: 20,
  minImportance: 5
}

export function getSummarizerConfig(): SummarizerConfig {
  const saved = localStorage.getItem('frontendai_summarizer')
  return saved ? { ...DEFAULT_CONFIG, ...JSON.parse(saved) } : DEFAULT_CONFIG
}

export function setSummarizerConfig(patch: Partial<SummarizerConfig>) {
  const current = getSummarizerConfig()
  const next = { ...current, ...patch }
  localStorage.setItem('frontendai_summarizer', JSON.stringify(next))
  return next
}

export async function shouldSummarize(): Promise<boolean> {
  const config = getSummarizerConfig()
  if (!config.enabled) return false

  const count = await db.messages.count()
  return count >= config.maxMessagesBeforeSummary
}

export async function summarizeMemories(): Promise<MemoryItem[]> {
  const config = getSummarizerConfig()
  const messages = await db.messages.orderBy('timestamp').toArray()
  
  if (messages.length < 10) return []

  // Take oldest 50% of messages to summarize
  const toSummarize = messages.slice(0, Math.floor(messages.length * 0.5))
  
  // Group by conversation windows (simple heuristic)
  const windows: Message[][] = []
  let currentWindow: Message[] = []
  let lastTime = 0

  for (const msg of toSummarize) {
    if (msg.timestamp - lastTime > 60000 * 30 || currentWindow.length > 10) {
      if (currentWindow.length > 0) windows.push(currentWindow)
      currentWindow = []
    }
    currentWindow.push(msg)
    lastTime = msg.timestamp
  }
  if (currentWindow.length > 0) windows.push(currentWindow)

  const newMemories: MemoryItem[] = []

  for (const window of windows) {
    if (window.length < 2) continue

    // Create summary using heuristics (real impl would use LLM)
    const userMessages = window.filter(m => m.role === 'user')
    const assistantMessages = window.filter(m => m.role === 'assistant')
    
    if (userMessages.length === 0) continue

    // Extract key facts
    const facts: string[] = []
    
    for (const um of userMessages) {
      const content = um.content.toLowerCase()
      // Look for fact patterns
      if (content.includes('my name is') || content.includes("i'm") || content.includes('i am') || content.includes('remember')) {
        facts.push(um.content)
      }
      // Look for preferences
      if (content.includes('i like') || content.includes('i love') || content.includes('i prefer') || content.includes('my favorite')) {
        facts.push(um.content)
      }
    }

    // If no explicit facts, create general summary
    let summaryContent: string
    if (facts.length > 0) {
      summaryContent = facts.join(' | ')
    } else {
      // General conversation summary
      const topics = extractTopics(window.map(m => m.content).join(' '))
      summaryContent = `Conversation about ${topics.join(', ')}: ${userMessages[0].content.slice(0,100)}...`
    }

    // Calculate importance based on fact density and recency
    const importance = Math.min(10, Math.max(1, 
      facts.length * 2 + 
      (window.some(m => m.content.toLowerCase().includes('important')) ? 3 : 0) +
      3
    ))

    if (importance < config.minImportance) continue

    try {
      const embedding = await embed(summaryContent)
      
      const memory: MemoryItem = {
        id: uid(),
        type: facts.length > 0 ? 'fact' : 'episodic',
        content: summaryContent,
        embedding,
        timestamp: Date.now(),
        importance,
        tags: ['auto-summary', ...extractTags(summaryContent)],
        source: `auto-summary-${window[0].id}`
      }

      await db.memories.add(memory)
      newMemories.push(memory)
    } catch (e) {
      console.warn('Failed to create memory from summary', e)
    }
  }

  // Optionally delete summarized messages (or keep them)
  // For now, keep all messages but mark as summarized
  // await db.messages.bulkDelete(toSummarize.map(m => m.id))

  return newMemories
}

function extractTopics(text: string): string[] {
  const commonTopics = ['frontend', 'backend', 'ai', 'agent', 'memory', 'code', 'javascript', 'python', 'react', 'vue', 'design', 'productivity', 'notes', 'tasks']
  const found: string[] = []
  const lower = text.toLowerCase()
  for (const topic of commonTopics) {
    if (lower.includes(topic)) found.push(topic)
  }
  return found.length > 0 ? found.slice(0,3) : ['general']
}

function extractTags(text: string): string[] {
  const tags: string[] = []
  const lower = text.toLowerCase()
  if (lower.includes('name is')) tags.push('identity')
  if (lower.includes('like') || lower.includes('love') || lower.includes('prefer')) tags.push('preference')
  if (lower.includes('work') || lower.includes('job') || lower.includes('project')) tags.push('work')
  if (lower.includes('code') || lower.includes('programming')) tags.push('coding')
  return tags
}

// Auto-run summarizer in background
let summarizerInterval: number | null = null

export function startAutoSummarizer(onSummary?: (memories: MemoryItem[]) => void) {
  if (summarizerInterval) return

  const config = getSummarizerConfig()
  if (!config.enabled) return

  summarizerInterval = window.setInterval(async () => {
    if (await shouldSummarize()) {
      console.log('[FrontendAI] Auto-summarizing memories...')
      const newMems = await summarizeMemories()
      if (newMems.length > 0) {
        console.log(`[FrontendAI] Created ${newMems.length} new memories from summary`)
        onSummary?.(newMems)
        // Notify via custom event
        window.dispatchEvent(new CustomEvent('frontendai:memories-updated', { detail: newMems }))
      }
    }
  }, config.intervalMs) as unknown as number

  // Also run once on start after 10s
  setTimeout(async () => {
    if (await shouldSummarize()) {
      const newMems = await summarizeMemories()
      if (newMems.length > 0) onSummary?.(newMems)
    }
  }, 10000)
}

export function stopAutoSummarizer() {
  if (summarizerInterval) {
    clearInterval(summarizerInterval)
    summarizerInterval = null
  }
}
