# FrontendAI OS — Agent that lives 100% in Frontend

> No backend. No tracking. The AI that never leaves your browser.

FrontendAI is a fully autonomous agent OS that runs on WebGPU, IndexedDB, and browser APIs. It can **see, hear, speak, remember forever, draw, code in Python, manage notes/tasks** — all in your tab.

**Live Demo:** Orb bottom-right → Chat, or press `⌘K`

## 🧠 What it is

- **General Assistant** + **Productivity OS** + **Creative Companion**
- Lives as a floating orb (Floating OS + IDE Sidecar vibe)
- ReAct loop: Thought → Action → Observation → Repeat
- All execution in browser, no server

## ✨ V4 Features — You kept saying "yes"

### 🧸 Companion Behaviors (New)
- **Mood system**: `idle` → `curious` → `bored` → `sleepy` → `focused` based on idle time, tab visibility, agent status
- **Idle detection**: 1min → bored suggestion, 2min → curious exploration, 5min → sleepy
- **Tab sleep**: When tab hidden → Zzz animation, wake message on return
- **Proactive nudges**: Suggests vault cleanup, graph view, reading page, drawing on canvas
- **Orb**: Shows mood badge, Zzz floating animation when sleepy, thought bubble when thinking
- **Toast**: Top-right companion thoughts (boredom, curiosity)
- Hook: `useCompanion()` — tracks activity, visibility, mood

### 🎨 Infinite Canvas Whiteboard (New)
- **CanvasBoard**: 1200x800 canvas with grid, tools: pencil, rect, circle, text, eraser
- **Features**: color picker, line width, undo, save to notes vault, export PNG, persistent in localStorage
- **Agent tool**: `drawOnCanvas` — agent can sketch diagrams via `{tool, color, points, text}`
- **Event**: `frontendai:canvas-update` — live update when agent draws
- Try: "draw a diagram of frontend AI architecture"

### 🐍 Python WASM via Pyodide (New)
- **PythonREPL**: Python 3.12 in browser via Pyodide WASM (10MB + stdlib)
- **micropip**: Install pure Python packages (numpy, pandas, etc) via CDN, no server
- **Tool**: `executePython` — agent can run Python code, returns output + result
- **REPL UI**: Code editor + output pane, package installer, clear, run
- Try: "run python to calculate fibonacci" or use Python tab directly

### Previous: V3
- **Memory Graph**: Force-directed canvas, nodes=memories/notes, edges=cosine similarity >0.6, physics
- **Whisper tiny.en** (40MB) local STT via transformers.js WASM
- **Vision**: screenshot (html2canvas) + local ViT-GPT2 + BYOK GPT-4o vision + WebLLM LLaVA

### Previous: V2
- **Voice**: Web Speech API STT + TTS, Voice tab with waveform
- **Vision**: Screenshot + captioning
- **Real embeddings**: all-MiniLM-L6-v2 384-dim

### Previous: V1
- Core ReAct loop, 12 tools, IndexedDB vault, floating OS

## 🏗️ Architecture (All Frontend)

### 1. LLM Layer
- **Mock** (default), **WebLLM** (Llama 3.2, Phi-3.5, LLaVA vision), **BYOK** (OpenAI, Groq), **Ollama**

### 2. Tool System (18 tools)
- **Page**: `readPage`, `queryDOM`, `highlightElement`, `extractArticle`, `captureScreenshot`, `analyzeImage`, `drawOnCanvas`
- **Productivity**: `createNote`, `createTask`, `searchMemory`, `remember`
- **System**: `getTime`, `clipboardWrite`, `notify`, `speak`
- **Code**: `executeJS`, `executePython`, `analyzePageJS`
- **Agent**: `setAutonomy`, `spawnSubAgent`

### 3. Memory
- Dexie DB + real 384-dim embeddings + graph visualization
- Canvas drawings in localStorage, notes in IndexedDB

### 4. UI — Floating OS
- **AgentOrb**: Breathing, mood badge, Zzz animation, orbiting dots, thought bubble
- **AgentDock**: 13 tabs — Chat, Vision, Voice, Whisper, Canvas, Python, Graph, Mind, Actions, Vault, Notes, Tasks, OS
- **CommandPalette**: `⌘K`

### 5. Privacy
- No backend, no cookies, no telemetry
- Keys in localStorage, screenshots in sessionStorage, audio never uploaded, Python runs in WASM

## 🚀 Quick Start

One command. Works on **Windows (native or WSL), Linux, and macOS** — needs Node `20.19+` or `22.12+`.

```bash
npm install
```

Then start the dev server with `npm run dev` and open http://localhost:5173.

> **Why install is this quiet:** `.npmrc` sets `ignore-scripts=true`. This app is
> browser-only, and the only dependency with a native install step is
> `onnxruntime-node` — reachable solely through `@huggingface/transformers`' `node`
> export condition, which Vite never resolves (it uses the `default` condition →
> `transformers.web.js` / onnxruntime-web WASM). Every binary the build *does* need
> (rolldown, lightningcss, sharp) ships as `optionalDependencies` tarballs, so npm
> picks the right one for your OS/arch with no compile step. Delete that line if you
> add a dependency that must build at install time.

Try:
- "Take screenshot and analyze"
- "Draw a diagram of my vault"
- "Run python to plot a chart" (needs matplotlib via micropip)
- "Remember my name is Alex" → Graph tab → see connections
- Mic → speak → Whisper local transcribe
- Leave idle 1min → companion gets bored → suggests action

## 📁 Structure

```
src/
  agent/
    tools/ definitions (18), executors (JS, Python, Canvas, Vision, Voice)
    memory/ db.ts + embeddings.ts
    core/ loop.ts
  components/
    AgentOrb (mood), AgentDock (13 tabs), Chat, VisionPanel, VoiceControl, WhisperControl, CanvasBoard, PythonREPL, MemoryGraph, ...
  hooks/ useAgent, useVoice, useWhisper, useCompanion, usePyodide
```

## 🎯 Evolution

- **V1**: Core OS, 12 tools, floating OS
- **V2**: Voice, Vision, Real embeddings
- **V3**: Memory graph, Whisper, BYOK vision, LLaVA
- **V4**: Companion behaviors (idle/bored/sleepy/curious), Canvas whiteboard, Python WASM

All 100% frontend, no backend, ever.

Built with Vite, React, Tailwind v4, Framer Motion, Dexie, html2canvas, @huggingface/transformers, Pyodide.
