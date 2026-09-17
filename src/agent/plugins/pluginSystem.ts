/**
 * Plugin Marketplace — Local Skills
 * 100% frontend, no server, plugins stored in IndexedDB + localStorage
 * Each plugin can add tools, hooks, UI, etc
 */

import Dexie, { type Table } from 'dexie'
import { uid } from '../../lib/utils'
import type { ToolDefinition } from '../types'

export type PluginManifest = {
  id: string
  name: string
  description: string
  version: string
  author: string
  icon: string
  category: 'productivity' | 'page' | 'memory' | 'code' | 'voice' | 'vision' | 'fun'
  enabled: boolean
  installedAt: number
  updatedAt: number
  permissions: string[] // e.g. ['readPage', 'clipboard', 'fs']
  tools?: ToolDefinition[]
  code: string // JS code that exports hooks
  config?: Record<string, any>
  downloads?: number
  rating?: number
}

class PluginDB extends Dexie {
  plugins!: Table<PluginManifest>

  constructor() {
    super('FrontendAI_Plugins')
    this.version(1).stores({
      plugins: 'id, category, enabled, installedAt'
    })
  }
}

export const pluginDb = new PluginDB()

// Built-in plugins marketplace (local, no server)
export const BUILTIN_PLUGINS: Omit<PluginManifest, 'enabled' | 'installedAt' | 'updatedAt' | 'id'>[] = [
  {
    name: 'Summarize This Page',
    description: 'One-click summarize any page, save to notes, speak result. Uses extractArticle + LLM.',
    version: '1.0.0',
    author: 'FrontendAI',
    icon: '📄',
    category: 'page',
    permissions: ['readPage', 'createNote', 'speak'],
    code: `
// Plugin: Summarize This Page
export async function onPageLoad() {
  console.log('Summarizer plugin loaded');
}
export async function run({ tools }) {
  const article = await tools.extractArticle();
  return { summary: article.text.slice(0,500), title: article.title };
}
`,
    config: { maxLength: 500 },
    downloads: 1243,
    rating: 4.8
  },
  {
    name: 'Meeting Notes',
    description: 'Auto-capture meeting notes from voice, transcribe with Whisper, summarize, save.',
    version: '1.2.0',
    author: 'FrontendAI',
    icon: '🎙️',
    category: 'productivity',
    permissions: ['voice', 'memory'],
    code: `
export async function onVoiceTranscript(transcript) {
  if (transcript.includes('meeting') || transcript.includes('notes')) {
    return { action: 'createNote', title: 'Meeting ' + new Date().toLocaleString(), content: transcript };
  }
}
`,
    config: {},
    downloads: 892,
    rating: 4.6
  },
  {
    name: 'Code Explainer',
    description: 'Select code on page, explain it, run it in sandbox, draw diagram on canvas.',
    version: '1.0.5',
    author: 'Community',
    icon: '💡',
    category: 'code',
    permissions: ['queryDOM', 'executeJS', 'drawOnCanvas'],
    code: `
export async function onSelection(code) {
  // Explain code
  return { explanation: 'This code does...', runnable: true };
}
`,
    config: {},
    downloads: 2103,
    rating: 4.9
  },
  {
    name: 'Memory Cleaner',
    description: 'Find low-importance old memories, suggest archiving, keep vault tidy. Companion behavior.',
    version: '1.1.0',
    author: 'FrontendAI',
    icon: '🧹',
    category: 'memory',
    permissions: ['memory'],
    code: `
export async function onIdle(mood) {
  if (mood === 'bored') {
    return { suggestion: 'Clean vault?', action: 'list low importance memories' };
  }
}
`,
    config: { minImportance: 3, maxAgeDays: 30 },
    downloads: 543,
    rating: 4.4
  },
  {
    name: 'Voice Commander',
    description: 'Control page with voice: "scroll down", "click login", "highlight buttons".',
    version: '2.0.0',
    author: 'Community',
    icon: '🎤',
    category: 'voice',
    permissions: ['voice', 'page'],
    code: `
export function onVoiceCommand(cmd) {
  if (cmd.includes('scroll')) return { tool: 'executeJS', args: { code: 'window.scrollBy(0,500)' } };
  if (cmd.includes('highlight')) return { tool: 'highlightElement', args: { selector: 'button' } };
}
`,
    config: {},
    downloads: 3211,
    rating: 4.7
  },
  {
    name: 'Diagram Drawer',
    description: 'Agent draws architecture diagrams, flowcharts on canvas from text description.',
    version: '1.3.0',
    author: 'FrontendAI',
    icon: '🎨',
    category: 'vision',
    permissions: ['canvas'],
    code: `
export async function onGoal(goal) {
  if (goal.includes('diagram') || goal.includes('draw')) {
    // Parse and draw
    return { tool: 'drawOnCanvas', action: 'rect' };
  }
}
`,
    config: {},
    downloads: 1567,
    rating: 4.8
  },
  {
    name: 'RAG Helper',
    description: 'Auto-index OPFS files on change, answer questions via RAG, inject context.',
    version: '1.0.0',
    author: 'FrontendAI',
    icon: '📚',
    category: 'productivity',
    permissions: ['opfs', 'rag'],
    code: `
export async function onFileChange(file) {
  // Auto index
  return { action: 'indexFile', file: file.name };
}
`,
    config: { autoIndex: true, chunkSize: 500 },
    downloads: 723,
    rating: 4.5
  },
  {
    name: 'Python Data Viz',
    description: 'Run Python to generate charts via matplotlib, save to canvas, display.',
    version: '1.0.2',
    author: 'Community',
    icon: '📊',
    category: 'code',
    permissions: ['python', 'canvas'],
    code: `
export async function onPythonResult(result) {
  if (result.includes('matplotlib')) {
    return { action: 'drawOnCanvas', text: 'Chart generated' };
  }
}
`,
    config: {},
    downloads: 945,
    rating: 4.6
  },
  {
    name: 'Fun: Roast Me',
    description: 'Roast the current page / code in a funny way. Pure fun, no harm.',
    version: '0.9.0',
    author: 'Community',
    icon: '🔥',
    category: 'fun',
    permissions: ['readPage'],
    code: `
export async function roast(page) {
  return { roast: 'This page has more divs than my brain has memories... and I have ' + page.text.length + ' chars!' };
}
`,
    config: {},
    downloads: 4231,
    rating: 4.9
  }
]

export async function getInstalledPlugins(): Promise<PluginManifest[]> {
  return await pluginDb.plugins.toArray()
}

export async function installPlugin(builtinIndex: number): Promise<PluginManifest> {
  const builtin = BUILTIN_PLUGINS[builtinIndex]
  if (!builtin) throw new Error('Plugin not found')

  const existing = await pluginDb.plugins.where('name').equals(builtin.name).first()
  if (existing) return existing

  const plugin: PluginManifest = {
    id: uid(),
    ...builtin,
    enabled: true,
    installedAt: Date.now(),
    updatedAt: Date.now()
  }

  await pluginDb.plugins.add(plugin)
  return plugin
}

export async function installCustomPlugin(manifest: Partial<PluginManifest> & { name: string, code: string }): Promise<PluginManifest> {
  const plugin: PluginManifest = {
    id: uid(),
    name: manifest.name,
    description: manifest.description || 'Custom plugin',
    version: manifest.version || '0.1.0',
    author: manifest.author || 'You',
    icon: manifest.icon || '🔌',
    category: manifest.category || 'productivity',
    enabled: true,
    installedAt: Date.now(),
    updatedAt: Date.now(),
    permissions: manifest.permissions || [],
    code: manifest.code,
    config: manifest.config || {}
  }

  await pluginDb.plugins.add(plugin)
  return plugin
}

export async function togglePlugin(id: string, enabled: boolean) {
  await pluginDb.plugins.update(id, { enabled, updatedAt: Date.now() })
}

export async function uninstallPlugin(id: string) {
  await pluginDb.plugins.delete(id)
}

export async function updatePluginConfig(id: string, config: Record<string, any>) {
  await pluginDb.plugins.update(id, { config, updatedAt: Date.now() })
}

// Execute plugin code safely (sandboxed via Function)
export async function executePlugin(plugin: PluginManifest, hook: string, ...args: any[]) {
  if (!plugin.enabled) return null

  try {
    // Very basic sandbox — real would use worker
    const fn = new Function('exports', 'args', `
      ${plugin.code}
      if (typeof ${hook} === 'function') {
        return ${hook}(...args);
      }
      return null;
    `)
    const exports: any = {}
    const result = fn(exports, args)
    return result instanceof Promise ? await result : result
  } catch (e: any) {
    console.warn(`Plugin ${plugin.name} hook ${hook} failed`, e)
    return { error: e.message }
  }
}
