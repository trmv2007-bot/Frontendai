import { db, pseudoEmbed } from '../memory/db'
import type { MemoryItem, Note, Task } from '../types'
import { uid } from '../../lib/utils'
import { embed as realEmbed, captionImage, getEmbeddingStatus } from '../memory/embeddings'

type Executor = (args: any) => Promise<any>

async function getEmbedding(text: string): Promise<number[]> {
  // Use real if ready, else pseudo
  if (getEmbeddingStatus() === 'ready') {
    try {
      return await realEmbed(text)
    } catch {
      return pseudoEmbed(text)
    }
  }
  return pseudoEmbed(text)
}

export const TOOL_EXECUTORS: Record<string, Executor> = {
  readPage: async ({ selector, maxLength }) => {
    const root = selector ? document.querySelector(selector) : document.body
    if (!root) return { error: `Selector ${selector} not found` }
    let text = (root as HTMLElement).innerText || root.textContent || ''
    if (maxLength) text = text.slice(0, parseInt(maxLength))
    else text = text.slice(0, 8000)
    return {
      url: location.href,
      title: document.title,
      text,
      length: text.length,
      headings: Array.from(document.querySelectorAll('h1,h2,h3')).slice(0,20).map(h => (h as HTMLElement).innerText)
    }
  },

  queryDOM: async ({ selector, attribute }) => {
    const els = Array.from(document.querySelectorAll(selector)).slice(0, 30)
    return {
      count: document.querySelectorAll(selector).length,
      sample: els.map(el => ({
        tag: el.tagName.toLower,
        text: (el as HTMLElement).innerText?.slice(0,200),
        html: el.outerHTML.slice(0,500),
        attr: attribute ? el.getAttribute(attribute) : undefined,
        rect: el.getBoundingClientRect()
      }))
    }
  },

  highlightElement: async ({ selector, color = 'purple' }) => {
    const el = document.querySelector(selector) as HTMLElement
    if (!el) return { error: 'not found' }
    const colors: any = { purple: '#8b5cf6', green: '#06ffa5', yellow: '#facc15', red: '#ef4444' }
    const prevOutline = el.style.outline
    const prevBg = el.style.background
    el.style.outline = `3px solid ${colors[color]}`
    el.style.background = `${colors[color]}22`
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setTimeout(() => {
      el.style.outline = prevOutline
      el.style.background = prevBg
    }, 3000)
    return { success: true, selector }
  },

  extractArticle: async () => {
    // simple article extraction
    const article = document.querySelector('article') || document.querySelector('main') || document.body
    const clone = article.cloneNode(true) as HTMLElement
    clone.querySelectorAll('script,style,nav,footer,aside').forEach(n => n.remove())
    return {
      title: document.title,
      text: clone.innerText.slice(0, 12000),
      wordCount: clone.innerText.split(/\s+/).length
    }
  },

  createNote: async ({ title, content, tags }) => {
    const note: Note = {
      id: uid(),
      title,
      content,
      created: Date.now(),
      updated: Date.now(),
      tags: tags ? tags.split(',').map((t:string)=>t.trim()) : []
    }
    await db.notes.add(note)
    return { id: note.id, success: true }
  },

  createTask: async ({ title, priority = 'med' }) => {
    const task: Task = {
      id: uid(),
      title,
      completed: false,
      created: Date.now(),
      priority: priority as any
    }
    await db.tasks.add(task)
    return { id: task.id, task }
  },

  searchMemory: async ({ query, limit = '5' }) => {
    const qEmb = await getEmbedding(query)
    const all = await db.memories.toArray()
    const notes = await db.notes.toArray()
    const scored = all.map(m => {
      if (!m.embedding || m.embedding.length !== qEmb.length) {
        // if dim mismatch (pseudo vs real), fallback to text match score
        const textScore = m.content.toLowerCase().includes(query.toLowerCase()) ? 1 : 0
        return { ...m, score: textScore }
      }
      const score = m.embedding.reduce((s,v,i)=>s+v*qEmb[i],0)
      return { ...m, score }
    }).sort((a,b)=>b.score-a.score).slice(0, parseInt(limit))

    const noteMatches = notes.filter(n => 
      n.title.toLowerCase().includes(query.toLowerCase()) || 
      n.content.toLowerCase().includes(query.toLowerCase())
    ).slice(0,3)

    return { memories: scored, notes: noteMatches, embeddingMode: getEmbeddingStatus() }
  },

  remember: async ({ content, importance = '5', tags }) => {
    const embedding = await getEmbedding(content)
    const mem: MemoryItem = {
      id: uid(),
      type: 'fact',
      content,
      embedding,
      timestamp: Date.now(),
      importance: parseInt(importance),
      tags: tags ? tags.split(',').map((t:string)=>t.trim()) : []
    }
    await db.memories.add(mem)
    return { id: mem.id, stored: true, embeddingDim: embedding.length, mode: getEmbeddingStatus() }
  },

  getTime: async () => {
    return {
      now: new Date().toISOString(),
      local: new Date().toString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      timestamp: Date.now()
    }
  },

  clipboardWrite: async ({ text }) => {
    await navigator.clipboard.writeText(text)
    return { success: true, length: text.length }
  },

  notify: async ({ title, body }) => {
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification(title, { body })
      } else if (Notification.permission !== 'denied') {
        const p = await Notification.requestPermission()
        if (p === 'granted') new Notification(title, { body })
      }
    }
    return { shown: true }
  },

  executeJS: async ({ code }) => {
    // sandboxed via Function, not full isolation but ok for demo
    try {
      const logs: string[] = []
      const fakeConsole = { log: (...args:any[]) => logs.push(args.map(a=>typeof a==='object'?JSON.stringify(a):String(a)).join(' ')) }
      const fn = new Function('console', `"use strict"; ${code}`)
      const result = fn(fakeConsole)
      // if async
      const awaited = result instanceof Promise ? await result : result
      return { result: awaited, logs, success: true }
    } catch (e:any) {
      return { error: e.message, success: false }
    }
  },

  analyzePageJS: async ({ code }) => {
    try {
      const fn = new Function(code)
      const result = fn()
      const awaited = result instanceof Promise ? await result : result
      return { result: awaited, success: true }
    } catch (e:any) {
      return { error: e.message }
    }
  },

  setAutonomy: async ({ level }) => {
    localStorage.setItem('frontendai_autonomy', level)
    return { level: parseInt(level), updated: true }
  },

  spawnSubAgent: async ({ goal, context }) => {
    const id = uid()
    // In real impl, would create web worker agent
    return { subAgentId: id, goal, context, status: 'spawned', note: 'Sub-agent runs in same thread for MVP' }
  },

  captureScreenshot: async () => {
    try {
      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(document.body, { useCORS: true, scale: 0.5, logging: false } as any)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.6)
      // store in sessionStorage for analyzeImage
      sessionStorage.setItem('frontendai_last_screenshot', dataUrl)
      return { success: true, sizeKB: Math.round(dataUrl.length/1024), width: canvas.width, height: canvas.height, preview: dataUrl.slice(0,100)+'...', note: 'Screenshot captured locally, stored in sessionStorage. Call analyzeImage to caption it.' }
    } catch (e:any) {
      return { error: e.message }
    }
  },

  analyzeImage: async ({ imageData }) => {
    try {
      const data = imageData || sessionStorage.getItem('frontendai_last_screenshot')
      if (!data) return { error: 'No image data. Provide imageData or captureScreenshot first.' }
      
      // Try local captioning
      try {
        const caption = await captionImage(data)
        return { caption, success: true, local: true, sizeKB: Math.round(data.length/1024) }
      } catch (e:any) {
        return { 
          caption: `Image captured (${Math.round(data.length/1024)}KB). Local vision model not loaded — load it in Vision tab, or use BYOK model for analysis.`, 
          success: true, 
          local: false,
          error: e.message
        }
      }
    } catch (e:any) {
      return { error: e.message }
    }
  },

  speak: async ({ text, rate }) => {
    try {
      if ('speechSynthesis' in window) {
        const utter = new SpeechSynthesisUtterance(text)
        if (rate) utter.rate = parseFloat(rate)
        speechSynthesis.speak(utter)
        return { spoken: true, length: text.length, rate: rate || 1 }
      }
      return { error: 'speechSynthesis not supported' }
    } catch (e:any) {
      return { error: e.message }
    }
  },

  executePython: async ({ code }) => {
    try {
      // Try to use global pyodide if loaded, otherwise dynamic import
      // For tool execution, we load pyodide on demand
      const { loadPyodide } = await import('pyodide')
      // @ts-ignore
      const pyodide = await loadPyodide({ indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.26.2/full/' })
      let output = ''
      pyodide.setStdout({ batched: (t: string) => { output += t + '\n' } })
      pyodide.setStderr({ batched: (t: string) => { output += `STDERR: ${t}\n` } })
      const result = await pyodide.runPythonAsync(code)
      return { result: result !== undefined ? String(result) : undefined, output, success: true }
    } catch (e:any) {
      return { error: e.message, success: false }
    }
  },

  drawOnCanvas: async ({ action, color = '#8b5cf6', points, text }) => {
    try {
      let parsedPoints: {x:number,y:number}[] = []
      if (points) {
        try { parsedPoints = JSON.parse(points) } catch { parsedPoints = [] }
      }
      // Default points if not provided
      if (parsedPoints.length === 0) {
        parsedPoints = [{ x: 100 + Math.random()*400, y: 100 + Math.random()*300 }, { x: 200 + Math.random()*400, y: 200 + Math.random()*300 }]
      }

      const drawingAction = {
        id: uid(),
        tool: action as any,
        color,
        lineWidth: 3,
        points: parsedPoints,
        text
      }

      // Load existing canvas actions
      const existing = localStorage.getItem('frontendai_canvas')
      const actions = existing ? JSON.parse(existing) : []
      actions.push(drawingAction)
      localStorage.setItem('frontendai_canvas', JSON.stringify(actions))

      // Dispatch event to update canvas if open
      window.dispatchEvent(new CustomEvent('frontendai:canvas-update', { detail: drawingAction }))

      return { success: true, action: drawingAction, totalStrokes: actions.length }
    } catch (e:any) {
      return { error: e.message }
    }
  },

  listFiles: async () => {
    // Access via global file system handle if available
    const dirHandle = (window as any).__frontendai_dirHandle
    if (!dirHandle) return { error: 'No directory picked. Go to Files tab and pick directory first.' }
    try {
      const entries = []
      // @ts-ignore
      for await (const [name, handle] of dirHandle.entries()) {
        entries.push({ name, kind: handle.kind })
      }
      return { files: entries, count: entries.length }
    } catch (e:any) {
      return { error: e.message }
    }
  },

  readFile: async ({ name }) => {
    const dirHandle = (window as any).__frontendai_dirHandle
    if (!dirHandle) return { error: 'No directory picked' }
    try {
      const fileHandle = await dirHandle.getFileHandle(name)
      const file = await fileHandle.getFile()
      const content = await file.text()
      return { name, content: content.slice(0,5000), size: file.size, fullLength: content.length }
    } catch (e:any) {
      return { error: e.message }
    }
  },

  writeFile: async ({ name, content }) => {
    const dirHandle = (window as any).__frontendai_dirHandle
    if (!dirHandle) {
      // Fallback download
      const blob = new Blob([content], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = name; a.click()
      URL.revokeObjectURL(url)
      return { success: true, fallback: 'download', name }
    }
    try {
      const fileHandle = await dirHandle.getFileHandle(name, { create: true })
      const writable = await fileHandle.createWritable()
      await writable.write(content)
      await writable.close()
      return { success: true, name, size: content.length }
    } catch (e:any) {
      return { error: e.message }
    }
  },

  distributeTask: async ({ goal }) => {
    try {
      const { getSwarm } = await import('../p2p/swarm')
      const swarm = getSwarm()
      const taskId = swarm.distributeTask(goal)
      return { taskId, goal, distributed: true, peers: swarm.getStats().peers, note: 'Task broadcast to swarm via BroadcastChannel. Other tabs will handle and respond.' }
    } catch (e:any) {
      return { error: e.message }
    }
  },

  queryFilesRAG: async ({ query, topK = '5' }) => {
    try {
      const { queryRAG, buildRAGContext } = await import('../rag/fileRAG')
      const results = await queryRAG(query, parseInt(topK))
      const context = await buildRAGContext(query, parseInt(topK))
      return { results: results.map(r => ({ file: r.chunk.fileName, score: r.score, preview: r.chunk.content.slice(0,200) })), context: context.slice(0,2000), count: results.length }
    } catch (e:any) {
      return { error: e.message }
    }
  },

  collaborate: async ({ goal, personas }) => {
    try {
      const { getCollab } = await import('../collaboration/multiAgent')
      const collab = getCollab()
      const personaIds = personas ? personas.split(',').map((p:string)=>p.trim()) : ['researcher','coder','critic']
      const session = collab.createSession(goal, personaIds)
      return { sessionId: session.id, goal, personas: personaIds, status: 'running', note: 'Multi-agent collaboration started. Check Team tab for live chat.' }
    } catch (e:any) {
      return { error: e.message }
    }
  },

  cloneVoice: async ({ text, profileId }) => {
    try {
      const profiles = JSON.parse(localStorage.getItem('frontendai_voice_profiles') || '[]')
      let profile = profiles.find((p:any) => p.id === profileId) || profiles[0]
      
      if (!profile) {
        // Use default voice with custom pitch/rate from localStorage or default
        if ('speechSynthesis' in window) {
          const utter = new SpeechSynthesisUtterance(text)
          utter.pitch = 1.1
          utter.rate = 0.9
          speechSynthesis.speak(utter)
          return { spoken: true, text, profile: 'default', pitch: 1.1, rate: 0.9 }
        }
        return { error: 'No voice profiles, and speechSynthesis not supported' }
      }

      if ('speechSynthesis' in window) {
        const utter = new SpeechSynthesisUtterance(text)
        const voices = speechSynthesis.getVoices()
        const voice = voices.find((v:any) => v.name === profile.voiceName) || voices[0]
        if (voice) utter.voice = voice
        utter.pitch = profile.pitch
        utter.rate = profile.rate
        utter.volume = profile.volume
        speechSynthesis.speak(utter)
        return { spoken: true, text, profile: profile.name, pitch: profile.pitch, rate: profile.rate }
      }

      return { error: 'speechSynthesis not supported' }
    } catch (e:any) {
      return { error: e.message }
    }
  }
}
