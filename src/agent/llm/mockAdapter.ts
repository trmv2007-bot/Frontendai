import type { LLMAdapter } from './adapter'
import type { Message, ToolDefinition } from '../types'
import { TOOL_EXECUTORS } from '../tools/executors'

export class MockAdapter implements LLMAdapter {
  name = 'mock'

  async isAvailable() { return true }

  async streamChat(
    messages: Message[],
    tools: ToolDefinition[],
    onChunk: (c: { text?: string; thought?: string; toolCall?: any; done?: boolean }) => void,
  ) {
    const lastUser = [...messages].reverse().find(m => m.role === 'user')?.content.toLowerCase() || ''
    
    // Simulate thinking
    const thoughts = [
      `User said: "${lastUser.slice(0,100)}". I need to parse intent.`,
      `Checking if this needs tools: ${tools.map(t=>t.name).slice(0,5).join(', ')}...`,
      `Context: ${messages.length} messages, living 100% frontend, no backend.`
    ]

    for (const t of thoughts) {
      onChunk({ thought: t })
      await sleep(300)
    }

    // Decide tool use based on keywords (simulated ReAct)
    let response = ''
    let toolCalls: any[] = []

    if (lastUser.includes('draw') || lastUser.includes('canvas') || lastUser.includes('sketch')) {
      const color = lastUser.includes('red') ? '#ef4444' : lastUser.includes('green') ? '#06ffa5' : lastUser.includes('blue') ? '#3b82f6' : '#8b5cf6'
      toolCalls = [{ name: 'drawOnCanvas', arguments: { action: 'rect', color, points: JSON.stringify([{x:100,y:100},{x:300,y:200}]) }, id: 'call_draw' }]
      response = "Drawing on canvas..."
    } else if (lastUser.includes('python') || lastUser.includes('pyodide') || lastUser.includes('numpy')) {
      const code = messages[messages.length-1].content.replace(/.*python\s*/i,'').slice(0,500) || 'import math; print(math.pi)'
      toolCalls = [{ name: 'executePython', arguments: { code }, id: 'call_py' }]
      response = "Running Python via Pyodide WASM..."
    } else if (lastUser.includes('screenshot') || lastUser.includes('capture') && lastUser.includes('page')) {
      toolCalls = [{ name: 'captureScreenshot', arguments: {}, id: 'call_ss' }]
      response = "Taking screenshot locally with html2canvas..."
    } else if (lastUser.includes('analyze') && (lastUser.includes('image') || lastUser.includes('screenshot'))) {
      toolCalls = [{ name: 'analyzeImage', arguments: {}, id: 'call_vision' }]
      response = "Analyzing last screenshot with local vision model..."
    } else if (lastUser.startsWith('speak ') || lastUser.includes('say ') || lastUser.includes('speak')) {
      const text = messages[messages.length-1].content.replace(/^speak\s+/i,'').slice(0,300)
      toolCalls = [{ name: 'speak', arguments: { text }, id: 'call_speak' }]
      response = `Speaking: "${text.slice(0,50)}..."`
    } else if (lastUser.includes('read') && (lastUser.includes('page') || lastUser.includes('site'))) {
      toolCalls = [{ name: 'readPage', arguments: {}, id: 'call_1' }]
      response = "I'll read the current page to understand context."
    } else if (lastUser.includes('remember') || lastUser.includes('my name') || lastUser.includes('i am') || lastUser.includes("i'm")) {
      const fact = messages[messages.length-1].content
      toolCalls = [{ name: 'remember', arguments: { content: fact, importance: '7', tags: 'user' }, id: 'call_rem' }]
      response = "Got it — storing that in my long-term memory vault (IndexedDB, 100% local)."
    } else if (lastUser.includes('note')) {
      toolCalls = [{ name: 'createNote', arguments: { title: 'Quick note', content: lastUser, tags: 'quick' }, id: 'call_note' }]
      response = "Creating a note for you in the local vault."
    } else if (lastUser.includes('task') || lastUser.includes('todo') || lastUser.includes('remind')) {
      toolCalls = [{ name: 'createTask', arguments: { title: lastUser.replace('create task','').trim() || 'New task', priority: 'med' }, id: 'call_task' }]
      response = "Adding that to your tasks."
    } else if (lastUser.includes('search') && lastUser.includes('memory')) {
      const q = lastUser.replace('search memory','').trim() || 'user'
      toolCalls = [{ name: 'searchMemory', arguments: { query: q, limit: '5' }, id: 'call_search' }]
      response = `Searching memory vault for "${q}"...`
    } else if (lastUser.includes('time') || lastUser.includes('date')) {
      toolCalls = [{ name: 'getTime', arguments: {}, id: 'call_time' }]
      response = "Checking local time..."
    } else if (lastUser.includes('calculate') || lastUser.includes('compute') || /\d+\s*[\+\-\*\/]\s*\d+/.test(lastUser)) {
      const code = `return ${lastUser.match(/[\d\+\-\*\/\(\)\.\s]+/)?.[0] || '2+2'}`
      toolCalls = [{ name: 'executeJS', arguments: { code }, id: 'call_js' }]
      response = "Let me compute that in my sandboxed JS runtime..."
    } else if (lastUser.includes('highlight')) {
      toolCalls = [{ name: 'highlightElement', arguments: { selector: 'h1,h2,button', color: 'purple' }, id: 'call_hl' }]
      response = "Highlighting relevant elements on page."
    } else if (lastUser.includes('summarize') || lastUser.includes('extract')) {
      toolCalls = [{ name: 'extractArticle', arguments: {}, id: 'call_ext' }]
      response = "Extracting and summarizing page content..."
    } else {
      // general chat
      const generalResponses = [
        `I'm FrontendAI — I live 100% in your browser. No backend, no tracking. Everything I remember stays in IndexedDB right here.\n\nI can:\n• **Read this page** and interact with DOM\n• **Remember** things long-term (try "remember my name is...")\n• **Manage notes & tasks** locally\n• **Run JS** in a sandbox for calculations\n• **Search my memory vault**\n\nWhat should we build together?`,
        `That’s interesting! As a frontend-native agent, I’m thinking about how I can actually *do* something with that, not just chat.\n\nWant me to:\n• Save it as a note?\n• Create a task?\n• Remember it for later?\n• Analyze the current page related to it?`,
        `Got it. I’m running in mock mode right now (streaming simulation), but I’m wired to support:\n\n**WebLLM** (Llama 3.2, Phi-3.5 via WebGPU)\n**BYOK** (OpenAI, Claude, Groq)\n**Transformers.js** embeddings for vector memory\n\nSwitch models in settings ⚙️. What are we tackling?`
      ]
      response = generalResponses[Math.floor(Math.random()*generalResponses.length)]
    }

    // If tool calls, emit them
    if (toolCalls.length) {
      for (const tc of toolCalls) {
        onChunk({ toolCall: { ...tc, status: 'running' } })
        await sleep(600)
        try {
          const executor = TOOL_EXECUTORS[tc.name]
          const result = executor ? await executor(tc.arguments) : { error: 'no executor' }
          onChunk({ toolCall: { ...tc, status: 'success', result } })
          // After tool, generate final response
          await sleep(400)
          const final = toolResultToMessage(tc.name, result, lastUser)
          for (const word of final.split(' ')) {
            onChunk({ text: word + ' ' })
            await sleep(30)
          }
        } catch (e:any) {
          onChunk({ toolCall: { ...tc, status: 'error', result: { error: e.message } } })
        }
      }
    } else {
      // stream text
      for (const word of response.split(' ')) {
        onChunk({ text: word + ' ' })
        await sleep(35)
      }
    }

    onChunk({ done: true })
  }
}

function toolResultToMessage(tool: string, result: any, query: string): string {
  switch(tool) {
    case 'readPage':
      return `I read the page **${result.title}** (${result.url}).\n\nFound ${result.text.length} chars. Headings: ${result.headings.join(', ') || 'none'}.\n\nSummary preview:\n> ${result.text.slice(0,300)}...\n\nWant me to extract the article or highlight something?`
    case 'remember':
      return `Stored! 🧠 I'll remember: "${result.id}" — ${result.embeddingDim}dim embedding (${result.mode}) in IndexedDB, never leaves browser.`
    case 'createNote':
      return `Note saved! 📝 ID ${result.id}. Check the Vault tab to see it.`
    case 'createTask':
      return `Task created: **${result.task.title}** (priority ${result.task.priority}). I added it to your local tasks.`
    case 'searchMemory':
      if (result.memories.length===0 && result.notes.length===0) return `No memories found for "${query}". My vault is still growing — teach me something!`
      return `Found ${result.memories.length} memories (${result.embeddingMode} mode) + ${result.notes.length} notes:\n\n${result.memories.map((m:any)=>`• ${m.content} (score ${m.score?.toFixed(3)} imp ${m.importance})`).join('\n')}\n${result.notes.map((n:any)=>`• Note: ${n.title}: ${n.content.slice(0,100)}`).join('\n')}`
    case 'getTime':
      return `Current time: **${result.local}**\nTimezone: ${result.timezone}\nISO: ${result.now}`
    case 'executeJS':
      return `Executed! Result: \`${JSON.stringify(result.result)}\`\nLogs: ${result.logs.join('\n') || 'none'}`
    case 'highlightElement':
      return result.success ? `Highlighted ${result.selector} in purple for 3s. Can you see it pulsing?` : `Couldn't find element.`
    case 'extractArticle':
      return `Extracted article (${result.wordCount} words):\n\n> ${result.text.slice(0,600)}...\n\nWant a summary or should I save this?`
    case 'captureScreenshot':
      return result.success ? `Screenshot captured! ${result.width}x${result.height}, ${result.sizeKB}KB stored locally in sessionStorage. Now call analyzeImage or check Vision tab.` : `Screenshot failed: ${result.error}`
    case 'analyzeImage':
      return result.caption ? `Vision analysis: ${result.caption}\nLocal: ${result.local} • ${result.sizeKB}KB • 100% frontend` : `Analyze failed: ${result.error}`
    case 'speak':
      return result.spoken ? `Speaking "${result.length} chars" at rate ${result.rate} via Web Speech API (local TTS).` : `Speak failed: ${result.error}`
    case 'executePython':
      return result.success ? `Python executed!\nOutput:\n${result.output}\nResult: ${result.result || 'none'}` : `Python failed: ${result.error}`
    case 'drawOnCanvas':
      return result.success ? `Drew on canvas! Tool: ${result.action.tool}, color ${result.action.color}, ${result.totalStrokes} total strokes. Check Canvas tab.` : `Draw failed: ${result.error}`
    default:
      return `Tool ${tool} returned: ${JSON.stringify(result).slice(0,500)}`
  }
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }
