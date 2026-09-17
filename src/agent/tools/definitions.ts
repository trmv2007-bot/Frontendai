import type { ToolDefinition } from '../types'

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  // PAGE TOOLS
  {
    name: 'readPage',
    description: 'Read the current page content, structure, and visible text. Use to understand context.',
    parameters: {
      type: 'object',
      properties: {
        selector: { type: 'string', description: 'CSS selector to narrow scope, optional' },
        maxLength: { type: 'string', description: 'max chars to return' }
      }
    },
    category: 'page',
    icon: 'eye'
  },
  {
    name: 'queryDOM',
    description: 'Query DOM elements and get their properties. Returns count and sample.',
    parameters: {
      type: 'object',
      properties: {
        selector: { type: 'string', description: 'CSS selector, e.g. button, [data-testid], etc' },
        attribute: { type: 'string', description: 'attribute to extract, optional' }
      },
      required: ['selector']
    },
    category: 'page',
    icon: 'search'
  },
  {
    name: 'highlightElement',
    description: 'Visually highlight an element on page to show user what you found.',
    parameters: {
      type: 'object',
      properties: {
        selector: { type: 'string', description: 'CSS selector to highlight' },
        color: { type: 'string', description: 'highlight color', enum: ['purple', 'green', 'yellow', 'red'] }
      },
      required: ['selector']
    },
    category: 'page',
    icon: 'highlighter'
  },
  {
    name: 'extractArticle',
    description: 'Extract main article content from page, removing noise. Best for summarizing.',
    parameters: {
      type: 'object',
      properties: {}
    },
    category: 'page',
    icon: 'file-text'
  },
  // PRODUCTIVITY
  {
    name: 'createNote',
    description: 'Save a note to the agent memory vault. Use for important facts user tells you.',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Note title' },
        content: { type: 'string', description: 'Note body, markdown supported' },
        tags: { type: 'string', description: 'comma separated tags' }
      },
      required: ['title', 'content']
    },
    category: 'productivity',
    icon: 'sticky-note'
  },
  {
    name: 'createTask',
    description: 'Create a todo task.',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Task title' },
        priority: { type: 'string', description: 'priority', enum: ['low', 'med', 'high'] }
      },
      required: ['title']
    },
    category: 'productivity',
    icon: 'check-square'
  },
  {
    name: 'searchMemory',
    description: 'Search long-term memory vault for relevant memories, notes, past conversations.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'search query' },
        limit: { type: 'string', description: 'max results' }
      },
      required: ['query']
    },
    category: 'memory',
    icon: 'brain'
  },
  {
    name: 'remember',
    description: 'Store a long-term memory fact about user, preference, or important context.',
    parameters: {
      type: 'object',
      properties: {
        content: { type: 'string', description: 'what to remember' },
        importance: { type: 'string', description: '1-10 importance', enum: ['1','3','5','7','10'] },
        tags: { type: 'string', description: 'tags' }
      },
      required: ['content']
    },
    category: 'memory',
    icon: 'heart'
  },
  // SYSTEM
  {
    name: 'getTime',
    description: 'Get current time, date, timezone.',
    parameters: { type: 'object', properties: {} },
    category: 'system',
    icon: 'clock'
  },
  {
    name: 'clipboardWrite',
    description: 'Write text to clipboard.',
    parameters: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'text to copy' }
      },
      required: ['text']
    },
    category: 'system',
    icon: 'clipboard'
  },
  {
    name: 'notify',
    description: 'Show a system notification.',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'notification title' },
        body: { type: 'string', description: 'body' }
      },
      required: ['title']
    },
    category: 'system',
    icon: 'bell'
  },
  // CODE
  {
    name: 'executeJS',
    description: 'Execute JavaScript in a sandboxed worker. Can do calculations, data transforms. No DOM access.',
    parameters: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'JS code, last expression is returned. Use console.log for output' }
      },
      required: ['code']
    },
    category: 'code',
    icon: 'code-2'
  },
  {
    name: 'executePython',
    description: 'Execute Python 3.12 in browser via Pyodide WASM. Can use numpy, pandas, etc via micropip. 100% local.',
    parameters: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'Python code to execute' }
      },
      required: ['code']
    },
    category: 'code',
    icon: 'terminal'
  },
  {
    name: 'drawOnCanvas',
    description: 'Draw on the infinite canvas whiteboard. Agent can sketch diagrams, ideas.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', description: 'draw action JSON: {tool: pencil|rect|circle|text, color, points: [{x,y}], text?}', enum: ['pencil','rect','circle','text'] },
        color: { type: 'string', description: 'hex color, e.g. #8b5cf6' },
        points: { type: 'string', description: 'JSON array of points [{x,y}]' },
        text: { type: 'string', description: 'text if tool is text' }
      },
      required: ['action']
    },
    category: 'page',
    icon: 'palette'
  },
  {
    name: 'analyzePageJS',
    description: 'Run JS in page context to analyze or collect data. Use with care.',
    parameters: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'JS code to run in page context' }
      },
      required: ['code']
    },
    category: 'code',
    icon: 'terminal',
    needsConfirmation: true
  },
  // VISION
  {
    name: 'captureScreenshot',
    description: 'Take a screenshot of current page using html2canvas. Returns image data URL info. 100% local.',
    parameters: { type: 'object', properties: {} },
    category: 'page',
    icon: 'camera'
  },
  {
    name: 'analyzeImage',
    description: 'Analyze an image that user uploaded or screenshot. Uses local vision model if loaded, otherwise describes metadata.',
    parameters: {
      type: 'object',
      properties: {
        imageData: { type: 'string', description: 'base64 data URL or image URL, optional if using last screenshot' }
      }
    },
    category: 'page',
    icon: 'eye'
  },
  // VOICE
  {
    name: 'speak',
    description: 'Speak text aloud using browser SpeechSynthesis (TTS). Voice is local.',
    parameters: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'text to speak' },
        rate: { type: 'string', description: '0.5 to 2, optional' }
      },
      required: ['text']
    },
    category: 'system',
    icon: 'volume-2'
  },
  // AGENT
  {
    name: 'setAutonomy',
    description: 'Change your autonomy level: 0=ask always, 1=confirm risky, 2=auto safe, 3=full auto',
    parameters: {
      type: 'object',
      properties: {
        level: { type: 'string', description: '0,1,2,3', enum: ['0','1','2','3'] }
      },
      required: ['level']
    },
    category: 'agent',
    icon: 'sliders'
  },
  {
    name: 'spawnSubAgent',
    description: 'Spawn a sub-agent to do a parallel task. Returns sub-agent ID. Runs in Web Worker.',
    parameters: {
      type: 'object',
      properties: {
        goal: { type: 'string', description: 'goal for sub-agent' },
        context: { type: 'string', description: 'extra context' }
      },
      required: ['goal']
    },
    category: 'agent',
    icon: 'bot'
  },
  {
    name: 'listFiles',
    description: 'List files in picked directory via File System Access API. Requires directory picked first in Files tab.',
    parameters: { type: 'object', properties: {} },
    category: 'productivity',
    icon: 'folder'
  },
  {
    name: 'readFile',
    description: 'Read a file from picked directory. Returns content.',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'file name' }
      },
      required: ['name']
    },
    category: 'productivity',
    icon: 'file'
  },
  {
    name: 'writeFile',
    description: 'Write file to picked directory via File System Access API. Real file on disk.',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'file name' },
        content: { type: 'string', description: 'file content' }
      },
      required: ['name', 'content']
    },
    category: 'productivity',
    icon: 'save'
  },
  {
    name: 'distributeTask',
    description: 'Distribute task to P2P swarm (other tabs). Uses BroadcastChannel + WebRTC.',
    parameters: {
      type: 'object',
      properties: {
        goal: { type: 'string', description: 'task to distribute' }
      },
      required: ['goal']
    },
    category: 'agent',
    icon: 'radio'
  },
  {
    name: 'queryFilesRAG',
    description: 'Query files via RAG — semantic search over indexed OPFS, notes, memories. Returns relevant chunks.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'search query' },
        topK: { type: 'string', description: 'number of chunks' }
      },
      required: ['query']
    },
    category: 'productivity',
    icon: 'file-search'
  },
  {
    name: 'collaborate',
    description: 'Start multi-agent collaboration with personas (researcher, coder, critic, creative, planner) on a goal.',
    parameters: {
      type: 'object',
      properties: {
        goal: { type: 'string', description: 'goal for team' },
        personas: { type: 'string', description: 'comma separated persona ids: researcher,coder,critic,creative,planner' }
      },
      required: ['goal']
    },
    category: 'agent',
    icon: 'users'
  },
  {
    name: 'cloneVoice',
    description: 'Speak with cloned voice profile. Uses pitch/rate from voice cloning.',
    parameters: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'text to speak' },
        profileId: { type: 'string', description: 'voice profile id, optional, uses default if not provided' }
      },
      required: ['text']
    },
    category: 'system',
    icon: 'mic-2'
  }
]
