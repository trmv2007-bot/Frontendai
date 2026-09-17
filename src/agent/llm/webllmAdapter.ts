import type { LLMAdapter } from './adapter'
import type { Message, ToolDefinition } from '../types'

/**
 * WebLLM (WebGPU) adapter.
 *
 * The engine is loaded at runtime from an ESM CDN, NOT imported as a bare package
 * specifier. Vite resolves every bare `import()` at transform time — even inside a
 * try/catch, and even with a `as any` cast on the specifier, which is erased before
 * the import-analysis plugin ever sees it — so a missing node_modules entry used to
 * kill the dev server and the build with:
 *   Failed to resolve import "@mlc-ai/web-llm" from "src/agent/llm/webllmAdapter.ts"
 * A URL import can never do that, and it matches how the rest of the app pulls its
 * heavy AI runtimes (pyodide, onnxruntime-wasm, HF model weights) while keeping
 * ~14 MB of WebLLM out of the bundle and out of the single-file/extension builds.
 *
 * Self-host it or pin another build without touching this file:
 *   localStorage.setItem('frontendai:webllm.url', 'https://your.host/web-llm.js')
 * Prefer a bundled local copy instead? `npm i @mlc-ai/web-llm` and change the
 * specifier in loadWebLLMModule() to `await import('@mlc-ai/web-llm')`.
 */
export const WEBLLM_VERSION = '0.2.85'

const CDN_SOURCES = [
  `https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@${WEBLLM_VERSION}/+esm`,
  `https://esm.sh/@mlc-ai/web-llm@${WEBLLM_VERSION}?bundle`
]

/** Override URL first (self-hosting), then the CDN mirrors. */
export function webllmSources(): string[] {
  let override: string | null = null
  try {
    override = typeof localStorage !== 'undefined' ? localStorage.getItem('frontendai:webllm.url') : null
  } catch {
    override = null // private mode / non-browser
  }
  return override ? [override, ...CDN_SOURCES] : CDN_SOURCES
}

let cachedModule: Promise<any> | null = null

/**
 * Resolves the WebLLM module, trying each source in order.
 * The specifier is a variable + `@vite-ignore`, so neither Vite's import-analysis
 * plugin (dev) nor the bundler (build) tries to resolve it — it stays a runtime fetch.
 */
export function loadWebLLMModule(onSource?: (url: string) => void): Promise<any> {
  if (!cachedModule) {
    const attempt = (async () => {
      const failures: string[] = []
      for (const source of webllmSources()) {
        onSource?.(source)
        try {
          const mod = await import(/* @vite-ignore */ source)
          if (mod && typeof mod.CreateMLCEngine === 'function') return mod
          failures.push(`${source} — no CreateMLCEngine export`)
        } catch (e: any) {
          failures.push(`${source} — ${e?.message || e}`)
        }
      }
      throw new Error(
        `Could not load the WebLLM runtime (${WEBLLM_VERSION}). Tried:\n- ${failures.join('\n- ')}\n` +
        `Check your network, or self-host it via localStorage['frontendai:webllm.url'].`
      )
    })()
    cachedModule = attempt
    // Let a later message retry the download instead of caching the failure forever.
    void attempt.catch(() => { if (cachedModule === attempt) cachedModule = null })
  }
  return cachedModule
}

export class WebLLMAdapter implements LLMAdapter {
  name = 'webllm'
  private engine: any = null
  private modelId: string
  lastError: string | null = null

  constructor(modelId = 'Llama-3.2-1B-Instruct-q4f32_1-MLC') {
    this.modelId = modelId
  }

  async isAvailable() {
    // WebGPU only exists in a secure context (https or localhost) on supported browsers.
    return typeof navigator !== 'undefined' && !!navigator.gpu && globalThis.isSecureContext !== false
  }

  async init(onProgress?: (p: any) => void) {
    if (this.engine) return true
    try {
      const { CreateMLCEngine } = await loadWebLLMModule(url =>
        onProgress?.({ text: `Fetching WebLLM runtime from ${new URL(url).host}…`, progress: 0 })
      )
      onProgress?.({ text: `Creating engine for ${this.modelId}…`, progress: 0 })
      this.engine = await CreateMLCEngine(this.modelId, { initProgressCallback: onProgress })
      this.lastError = null
      return true
    } catch (e: any) {
      this.lastError = e?.message || String(e)
      console.warn('WebLLM init failed, falling back to mock', e)
      return false
    }
  }

  async streamChat(
    messages: Message[],
    _tools: ToolDefinition[],
    onChunk: (c: any) => void
  ) {
    if (!this.engine) {
      const ok = await this.init((p: any) => onChunk({ thought: `Loading ${this.modelId}: ${p.text}` }))
      if (!ok) {
        const why = !globalThis.navigator?.gpu
          ? 'WebGPU is not available in this browser (or this is not a secure context).'
          : (this.lastError || 'Unknown error')
        onChunk({ text: `WebLLM unavailable. ${why}\n\nSwitch to Mock or BYOK in settings.` })
        onChunk({ done: true })
        return
      }
    }

    const prompt = messages.map(m => `${m.role}: ${m.content}`).join('\n')

    try {
      const chunks = await this.engine.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        stream: true
      })
      for await (const chunk of chunks) {
        const text = chunk.choices[0]?.delta?.content
        if (text) onChunk({ text })
      }
    } catch (e: any) {
      onChunk({ text: `WebLLM error: ${e.message}` })
    }
    onChunk({ done: true })
  }
}
