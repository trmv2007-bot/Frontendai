# FrontendAI OS — Agent that lives 100% in Frontend

> No backend. No tracking. The AI that never leaves your browser.

FrontendAI is a fully autonomous agent OS that runs on WebGPU, IndexedDB, and browser APIs. It can **see, hear, speak, remember forever, manage notes/tasks, run code** — all in your tab.

**Live Demo:** Orb bottom-right → Chat, or press `⌘K`

## 🧠 What it is

- **General Assistant** + **Productivity OS** + **Creative Companion**
- Lives as a floating orb (Floating OS + IDE Sidecar vibe)
- ReAct loop: Thought → Action → Observation → Repeat
- All execution in browser, no server

## ✨ V3 Features (You asked "yes" — we built all)

### 🎤 Voice — 100% Local
- **Web Speech API**: STT (SpeechRecognition) + TTS (speechSynthesis)
- **Whisper tiny.en** (40MB) via `@huggingface/transformers` — local STT fallback, WASM
- Voice tab: waveform, voice selector, auto-speak toggle
- Tool: `speak(text)` — agent can speak itself
- Chat: mic button, live transcript, speak button on every message

### 👁️ Vision — 100% Local + BYOK
- **Screenshot**: `html2canvas` renders DOM → canvas → data URL (no server)
- **Local Vision**: `Xenova/vit-gpt2-image-captioning` (300MB) via transformers.js
- **BYOK Vision**: GPT-4o vision via direct fetch (no proxy) if API key set
- **WebLLM Vision**: LLaVA / Phi-3.5-vision support (experimental, needs WebGPU)
- Vision tab: drag-drop, screenshot, 4 analysis modes
- Tools: `captureScreenshot`, `analyzeImage`

### 🧠 Real Embeddings + Memory Graph
- **Real embeddings**: `Xenova/all-MiniLM-L6-v2` (22MB, 384-dim) via transformers.js, ONNX WASM, cached
- Fallback pseudo-embeddings if model not loaded
- **Memory Graph**: Force-directed canvas graph, nodes = memories/notes, edges = cosine similarity >0.6 or tag overlap, physics simulation (repulsion + springs), click to inspect, 100% local

## 🏗️ Architecture (All Frontend)

### 1. LLM Layer — Switchable Brains
- **Mock** (default): Simulated ReAct for demo, no API needed
- **WebLLM**: Llama-3.2 1B/3B, Phi-3.5-mini, Gemma-2 2B + LLaVA vision via WebGPU (100% offline)
- **BYOK**: OpenAI, Groq, OpenRouter — direct `fetch()` from browser, no proxy, supports vision
- **Ollama**: `http://localhost:11434` bridge
- **Transformers.js**: Embeddings (384-dim) + Vision (ViT-GPT2) + Whisper (STT)

### 2. Tool System (16 tools, all browser APIs)
- **Page**: `readPage`, `queryDOM`, `highlightElement`, `extractArticle`, `captureScreenshot`, `analyzeImage`
- **Productivity**: `createNote`, `createTask`, `searchMemory`, `remember`
- **System**: `getTime`, `clipboardWrite`, `notify`, `speak`
- **Code**: `executeJS` (sandboxed), `analyzePageJS`
- **Agent**: `setAutonomy`, `spawnSubAgent`

### 3. Memory — Vector Vault in IndexedDB
- Dexie DB: `memories`, `notes`, `tasks`, `messages`
- Real embeddings (384-dim) → cosine similarity, or pseudo fallback (64-dim)
- Graph visualization: physics + similarity edges
- Importance scoring, tags, export/import brain JSON

### 4. UI — Floating OS
- **AgentOrb**: Breathing, orbiting dots when thinking, thought bubble, voice pulse
- **AgentDock**: 11 tabs — Chat, Vision, Voice, Whisper, Graph, Mind, Actions, Vault, Notes, Tasks, OS
- **CommandPalette**: `⌘K`
- Glassmorphism, grid bg, mouse glow

### 5. Privacy
- No backend, no cookies, no telemetry
- API keys in localStorage only, screenshots in sessionStorage, audio never uploaded
- PWA-ready, offline after models cached

## 🚀 Quick Start

```bash
npm install
npm run dev
```

Open http://localhost:5173

Try:
- "Read this page and summarize"
- "Take screenshot and analyze"
- "Remember my name is Alex"
- "Search my memory for rust"
- "Speak hello in voice mode"
- Click mic → speak → auto transcribe
- Vision tab → screenshot → BYOK GPT-4o vision

## 🗺️ Roadmap — What's Next

### Phase 1: Companion (Done: voice, vision, embeddings, graph)
- [x] Voice: Web Speech API + Whisper
- [x] Vision: screenshot + local + BYOK + WebLLM
- [x] Real embeddings + graph
- [ ] Idle behaviors: boredom → cleanup, curiosity → reads page
- [ ] Sleep/wake + persona editor

### Phase 2: Deep Page OS
- [ ] Shadow DOM overlay to annotate
- [ ] Click/type automation
- [ ] Form autofill from memory
- [ ] Tab manager

### Phase 3: Productivity Superpowers
- [ ] Notes backlinks graph (Obsidian-like) — graph done for memories, extend to notes
- [ ] Canvas: Excalidraw thinking board
- [ ] File System Access API vault

### Phase 4: Tool Universe
- [ ] Web Workers for sub-agents
- [ ] WASM Python via Pyodide
- [ ] WebRTC P2P swarm

## 📁 Structure

```
src/
  agent/
    types.ts
    llm/ adapter, mock, openai, webllm
    tools/ definitions, executors
    memory/ db.ts (Dexie) + embeddings.ts (real 384-dim)
    core/ loop.ts (ReAct)
  components/
    AgentOrb, AgentDock, Chat, ThoughtStream, ToolTimeline, MemoryVault, VisionPanel, VoiceControl, WhisperControl, MemoryGraph, CommandPalette
    Productivity/ Notes, Tasks
    Settings/ ModelSwitcher
  hooks/ useAgent, useVoice, useWhisper
  lib/ utils
```

## 💡 Why Frontend-Only is Powerful

- **Privacy**: Data never leaves device
- **Offline**: Works on plane after model download
- **No infra cost**: No backend to scale
- **Feels alive**: Instant, no latency, lives in tab
- **Hackable**: Inspect IndexedDB, export brain

Built with Vite, React, Tailwind v4, Framer Motion, Dexie, Lucide, html2canvas, @huggingface/transformers.

## 🎯 What You Asked

> "this is gonna be about ai agent which lives in frontend completely so what do u think we should add"

We added:
- **V1**: Core ReAct loop, 12 tools, IndexedDB vault, floating OS, mock + WebLLM + BYOK
- **V2**: Voice (STT/TTS), Vision (screenshot + captioning), Real embeddings (384-dim)
- **V3**: Memory graph (force-directed), Whisper local STT, BYOK vision (GPT-4o), WebLLM LLaVA

All 100% frontend, no backend, ever.
