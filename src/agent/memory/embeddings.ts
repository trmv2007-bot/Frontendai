/**
 * Real embeddings via @huggingface/transformers
 * Runs 100% in browser with ONNX + WASM
 * Model: all-MiniLM-L6-v2 (384 dim) -> quantized
 */

let embedder: any = null
let loadingPromise: Promise<any> | null = null

export type EmbeddingStatus = 'idle' | 'loading' | 'ready' | 'error'

let status: EmbeddingStatus = 'idle'
let statusListeners: Set<(s: EmbeddingStatus, detail?: string) => void> = new Set()

function setStatus(s: EmbeddingStatus, detail?: string) {
  status = s
  statusListeners.forEach(fn => fn(s, detail))
}

export function onEmbeddingStatus(fn: (s: EmbeddingStatus, detail?: string) => void) {
  statusListeners.add(fn)
  fn(status)
  return () => statusListeners.delete(fn)
}

export function getEmbeddingStatus() { return status }

export async function getEmbedder(onProgress?: (p: string) => void) {
  if (embedder) return embedder
  if (loadingPromise) return loadingPromise

  setStatus('loading', 'Downloading all-MiniLM-L6-v2...')

  loadingPromise = (async () => {
    try {
      // Dynamic import to avoid bundling issues
      const { pipeline, env } = await import('@huggingface/transformers')
      
      // Configure for browser - use wasm, cache in IndexedDB
      // @ts-ignore
      env.allowLocalModels = false
      // @ts-ignore
      env.useBrowserCache = true
      // @ts-ignore
      env.backends = env.backends || {}
      // @ts-ignore
      env.backends.onnx = env.backends.onnx || {}
      // @ts-ignore
      env.backends.onnx.wasm = env.backends.onnx.wasm || {}
      // @ts-ignore
      env.backends.onnx.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.18.0/dist/'

      onProgress?.('Loading embedding model (22MB)...')

      // Try newer model first, fallback to Xenova
      let pipe
      try {
        pipe = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
          // @ts-ignore
          quantized: true,
          progress_callback: (p: any) => {
            if (p.status === 'progress') {
              const msg = `${p.file} ${Math.round(p.progress || 0)}%`
              onProgress?.(msg)
              setStatus('loading', msg)
            }
          }
        })
      } catch (e) {
        console.warn('Xenova model failed, trying onnx-community', e)
        pipe = await pipeline('feature-extraction', 'onnx-community/all-MiniLM-L6-v2-ONNX', {
          // @ts-ignore
          dtype: 'q8',
          progress_callback: (p: any) => {
            if (p.status === 'progress') {
              const msg = `${p.file} ${Math.round(p.progress || 0)}%`
              onProgress?.(msg)
              setStatus('loading', msg)
            }
          }
        })
      }

      embedder = pipe
      setStatus('ready', 'Ready')
      onProgress?.('Ready — 384-dim vectors, local')
      return pipe
    } catch (e: any) {
      console.error('Embedding load failed', e)
      setStatus('error', e.message)
      onProgress?.(`Failed: ${e.message} — using pseudo embeddings`)
      throw e
    }
  })()

  return loadingPromise
}

export async function embed(text: string): Promise<number[]> {
  try {
    const pipe = await getEmbedder()
    const output = await pipe(text, { pooling: 'mean', normalize: true })
    // output is Tensor, convert to array
    const arr = Array.from(output.data as Float32Array)
    return arr
  } catch (e) {
    // fallback to pseudo
    console.warn('Real embed failed, fallback to pseudo', e)
    return pseudoEmbed(text, 384)
  }
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  const results: number[][] = []
  for (const t of texts) {
    results.push(await embed(t))
  }
  return results
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0
  let dot = 0, normA = 0, normB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB) || 1)
}

// Fallback pseudo for offline
function pseudoEmbed(text: string, dim = 384): number[] {
  const vec = new Array(dim).fill(0)
  const words = text.toLowerCase().split(/\W+/).filter(Boolean)
  for (let i = 0; i < words.length; i++) {
    const w = words[i]
    let h = 0
    for (let j = 0; j < w.length; j++) h = (h * 31 + w.charCodeAt(j)) >>> 0
    vec[h % dim] += 1
    vec[(h * 7) % dim] += 0.5
    vec[(h * 13) % dim] += 0.25
  }
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1
  return vec.map(v => v / norm)
}

// Vision embeddings - image captioning
let captioner: any = null

export async function getCaptioner(onProgress?: (p: string) => void) {
  if (captioner) return captioner
  try {
    const { pipeline, env } = await import('@huggingface/transformers')
    // @ts-ignore
    env.allowLocalModels = false
    // @ts-ignore
    env.useBrowserCache = true

    onProgress?.('Loading vision model...')
    const pipe = await pipeline('image-to-text', 'Xenova/vit-gpt2-image-captioning', {
      // @ts-ignore
      quantized: true,
      progress_callback: (p: any) => {
        if (p.status === 'progress') onProgress?.(`${p.file} ${Math.round(p.progress||0)}%`)
      }
    })
    captioner = pipe
    return pipe
  } catch (e) {
    console.warn('Captioner load failed', e)
    throw e
  }
}

export async function captionImage(image: string | HTMLImageElement | HTMLCanvasElement): Promise<string> {
  try {
    const pipe = await getCaptioner()
    const result = await pipe(image)
    return result[0]?.generated_text || 'No caption'
  } catch (e: any) {
    return `Vision unavailable: ${e.message}. Use WebLLM vision or BYOK.`
  }
}
