/**
 * RAG over files — 100% frontend
 * Chunks files from OPFS / FS API / Notes, embeds them, stores in Dexie, queries via cosine similarity
 */

import Dexie, { type Table } from 'dexie'
import { embed, cosineSimilarity, getEmbeddingStatus } from '../memory/embeddings'
import { uid } from '../../lib/utils'

export type FileChunk = {
  id: string
  fileName: string
  filePath: string
  content: string
  chunkIndex: number
  totalChunks: number
  embedding?: number[]
  timestamp: number
  size: number
  tags: string[]
}

class RAGDB extends Dexie {
  fileChunks!: Table<FileChunk>

  constructor() {
    super('FrontendAI_RAG')
    this.version(1).stores({
      fileChunks: 'id, fileName, timestamp'
    })
    this.version(2).stores({
      fileChunks: 'id, fileName, filePath, timestamp'
    })
  }
}

export const ragDb = new RAGDB()

export function chunkText(text: string, chunkSize = 500, overlap = 50): string[] {
  const chunks: string[] = []
  let start = 0
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length)
    chunks.push(text.slice(start, end))
    if (end === text.length) break
    start = end - overlap
  }
  return chunks
}

export async function indexFile(fileName: string, content: string, filePath = '/', tags: string[] = []): Promise<FileChunk[]> {
  const chunks = chunkText(content, 500, 50)
  const fileChunks: FileChunk[] = []

  for (let i = 0; i < chunks.length; i++) {
    const chunkContent = chunks[i]
    let embedding: number[] | undefined

    try {
      if (getEmbeddingStatus() === 'ready') {
        embedding = await embed(chunkContent)
      }
    } catch (e) {
      console.warn('Embedding failed for chunk', e)
    }

    const chunk: FileChunk = {
      id: uid(),
      fileName,
      filePath,
      content: chunkContent,
      chunkIndex: i,
      totalChunks: chunks.length,
      embedding,
      timestamp: Date.now(),
      size: chunkContent.length,
      tags
    }

    await ragDb.fileChunks.add(chunk)
    fileChunks.push(chunk)
  }

  return fileChunks
}

export async function queryRAG(query: string, topK = 5): Promise<{ chunk: FileChunk, score: number }[]> {
  const allChunks = await ragDb.fileChunks.toArray()
  if (allChunks.length === 0) return []

  // If embeddings not ready, fallback to keyword search
  if (getEmbeddingStatus() !== 'ready') {
    const lowerQuery = query.toLowerCase()
    const scored = allChunks.map(chunk => {
      const lowerContent = chunk.content.toLowerCase()
      let score = 0
      const words = lowerQuery.split(/\W+/).filter(Boolean)
      for (const w of words) {
        if (lowerContent.includes(w)) score += 1
      }
      return { chunk, score: score / words.length }
    }).filter(s => s.score > 0).sort((a,b) => b.score - a.score).slice(0, topK)
    return scored
  }

  // Real embedding search
  try {
    const queryEmbedding = await embed(query)
    
    const scored = allChunks.map(chunk => {
      if (!chunk.embedding || chunk.embedding.length !== queryEmbedding.length) {
        return { chunk, score: 0 }
      }
      const score = cosineSimilarity(queryEmbedding, chunk.embedding)
      return { chunk, score }
    }).filter(s => s.score > 0.1).sort((a,b) => b.score - a.score).slice(0, topK)

    return scored
  } catch (e) {
    console.warn('RAG query failed', e)
    return []
  }
}

export async function clearRAG() {
  await ragDb.fileChunks.clear()
}

export async function getRAGStats() {
  const chunks = await ragDb.fileChunks.toArray()
  const files = new Set(chunks.map(c => c.fileName))
  return {
    totalChunks: chunks.length,
    totalFiles: files.size,
    avgChunkSize: chunks.length ? Math.round(chunks.reduce((s,c)=>s+c.size,0)/chunks.length) : 0,
    files: Array.from(files)
  }
}

export async function indexOPFSFiles(opfsFiles: { name: string, content: string }[]) {
  const allChunks: FileChunk[] = []
  for (const file of opfsFiles) {
    const chunks = await indexFile(file.name, file.content, '/opfs/', ['opfs'])
    allChunks.push(...chunks)
  }
  return allChunks
}

export async function buildRAGContext(query: string, topK = 5): Promise<string> {
  const results = await queryRAG(query, topK)
  if (results.length === 0) return 'No relevant file chunks found.'

  const context = results.map((r, i) => 
    `[${i+1}] ${r.chunk.fileName} (chunk ${r.chunk.chunkIndex+1}/${r.chunk.totalChunks}, score ${r.score.toFixed(3)}):\n${r.chunk.content.slice(0,500)}`
  ).join('\n\n')

  return `Relevant file context for query "${query}":\n\n${context}\n\nUse this context to answer. All files are local, 100% frontend.`
}
