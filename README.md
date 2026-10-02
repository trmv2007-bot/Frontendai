# FrontendAI OS — The AI Agent That Lives in Your Frontend

> A browser-native agent runtime with a persistent visual presence, structured UI context, typed tools, memory, autonomy, and human control.

FrontendAI is designed as an **agent that lives inside the frontend**, not as a chatbot bolted onto the side of an application. The browser UI is the agent's environment: it can observe structured application context, plan multi-step work, use registered tools, react to events, remember relevant information, and keep the human in control.

**Repository:** https://github.com/trmv2007-bot/Frontendai

## ✨ What FrontendAI Does

- **Persistent agent presence** — a floating orb/agent UI that remains available across the app.
- **Structured environment context** — route, visible UI, selected elements, open panels, recent events, active task, available actions, and relevant app state.
- **Typed tool system** — discoverable tools with schemas, validation, handlers, results, errors, and permission/risk controls.
- **Real task runtime** — supports multi-step task execution with planning, inspection, action, observation, validation, correction, and completion.
- **Assist + Autonomous modes** — the user can choose how much control the agent has.
- **Human-in-the-loop controls** — pause, stop, take control, resume, and safe task interruption.
- **Activity visibility** — the agent exposes what it is doing through the UI instead of silently acting.
- **Layered memory** — short-term, session, project, user, and tool memory with selective retrieval.
- **Event-driven architecture** — frontend events can update agent context and drive reactive behavior.
- **Task checkpoints** — task progress can be persisted and resumed safely.
- **Browser-native execution** — application logic and agent infrastructure run in the frontend.

## 🧠 Agent Runtime

FrontendAI follows an agent loop built around the environment rather than a chat transcript:

```
Understand
   ↓
Plan
   ↓
Inspect
   ↓
Act
   ↓
Observe
   ↓
Validate
   ↓
Correct / Continue
   ↓
Complete
```

The runtime is intentionally separated from presentation. This makes the model/provider replaceable while the agent's environment, tools, memory, permissions, and task lifecycle remain application-level infrastructure.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     FrontendAI OS UI                        │
│  Agent Orb · Agent Dock · Activity · Chat · Vision · Tools │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                  Environment / Context Engine               │
│ route · UI · selection · panels · events · task · actions  │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                       Agent Runtime                         │
│ Understand → Plan → Inspect → Act → Observe → Validate     │
│ Pause · Resume · Stop · Checkpoint · Complete              │
└───────────────┬─────────────────────────────┬───────────────┘
                │                             │
                ▼                             ▼
┌──────────────────────────┐      ┌───────────────────────────┐
│       Tool Registry      │      │       Memory Layers       │
│ typed tools · schemas    │      │ short-term · session     │
│ validation · permissions │      │ project · user · tool     │
└──────────────┬───────────┘      └─────────────┬─────────────┘
               │                                │
               └────────────────┬───────────────┘
                                ▼
                    ┌────────────────────────┐
                    │     Model Interface    │
                    │ provider / model agnostic│
                    └────────────────────────┘
```

### Core layers

| Layer | Responsibility |
| --- | --- |
| Presentation | Application UI and agent-facing surfaces |
| Agent Presence | Persistent orb, dock, state, and controls |
| Context Engine | Selective structured context from the frontend |
| Runtime | Task planning, execution, validation, correction |
| Tool Registry | Typed, discoverable, permission-aware actions |
| Event System | Route/UI/task/build/error lifecycle events |
| Memory | Layered and selective persistence/retrieval |
| Model Interface | Replaceable model/provider integration |

## 🛠️ Tool Architecture

Tools are registered actions rather than arbitrary DOM manipulation.

A tool can define:

- Name and description
- Input schema
- Validation
- Handler
- Result and error shape
- Risk level / permission requirement
- Execution lifecycle

The architecture supports actions such as:

```text
navigate
openPanel
closePanel
click
select
inspect
create
edit
delete
search
runTask
runBuild
runTest
```

Existing product tools also cover browser interaction, productivity, code execution, vision, voice, canvas, and agent controls.

## 🧩 Event-Driven Frontend

The environment can react to structured events such as:

- `route_changed`
- `element_selected`
- `panel_opened`
- `user_clicked`
- `form_updated`
- `file_changed`
- `build_started`
- `build_failed`
- `build_completed`
- `error_detected`
- `task_completed`

The reactive environment hook keeps agent-facing context synchronized with these events without exposing the entire application state.

## 🧠 Memory

FrontendAI uses layered memory so every task does not need to carry the entire history:

- **Short-term** — immediate task context.
- **Session** — information useful during the current session.
- **Project** — durable project/task knowledge.
- **User** — user preferences and reusable context.
- **Tool** — information associated with tool execution.

Retrieval is selective so the agent receives relevant context rather than an uncontrolled dump of application state.

## 🎛️ Human Control

Autonomy does not mean losing control.

The runtime supports:

- **Assist** — the agent helps while the user remains closely involved.
- **Autonomous** — the agent can execute a multi-step task within its available tools and permissions.
- **Pause** — temporarily suspend a running task.
- **Stop** — terminate a task.
- **Take Control** — let the user manually intervene.
- **Resume** — continue from the safe task state/checkpoint when possible.

Destructive actions are permission-gated and can require confirmation.

## 🖥️ Current Frontend Experience

The project includes the existing visual agent experience and browser-native capabilities:

- Floating Agent Orb
- Agent Dock
- Chat
- Vision
- Voice / local speech capabilities
- Canvas whiteboard
- Python WASM execution
- Memory / graph views
- Notes and tasks
- Command palette
- Companion behavior and activity feedback

The agent presence is designed to feel like part of the operating environment rather than a conventional support widget.

## 🔒 Privacy & Browser-First Design

FrontendAI is built around a frontend-resident execution model:

- No required application backend for the core agent runtime
- Browser-side state and persistence
- IndexedDB/Dexie for durable local data
- WASM-based execution where applicable
- Model/provider integration kept replaceable
- No required telemetry service in the core architecture

> Third-party model/CDN providers may still be contacted when a selected model or dependency is configured to load remotely. Check the relevant provider/dependency configuration when strict offline operation is required.

## 🚀 Quick Start

Requirements: Node.js **20.19+ or 22.12+**.

```bash
git clone https://github.com/trmv2007-bot/Frontendai.git
cd Frontendai
npm install
npm run dev
```

Then open:

```
http://localhost:5173
```

### Production build

```bash
npm run build
npm run preview
```

### Lint

```bash
npm run lint
```

### Browser smoke test

FrontendAI has a Playwright browser-level smoke test covering the critical UI path:

```bash
npm run test:e2e
```

The CI workflow builds the application, installs Chromium, starts the production preview, and runs the browser smoke test.

## 🧪 Validation

The repository CI currently validates:

1. Dependency installation
2. Lint
3. Production TypeScript/Vite build
4. Chromium setup
5. Production preview startup
6. Browser-level E2E smoke test
7. Critical interaction path: landing page → agent orb → Agent OS → Assist/Autonomous → Activity/Vision/Chat → message submission
8. Browser console and page errors during the smoke test

## 📁 Project Structure

```
src/
├── agent/
│   ├── core/
│   │   ├── taskRuntime.ts
│   │   ├── permissions.ts
│   │   └── taskCheckpoint.ts
│   ├── environment/
│   │   ├── contextEngine.ts
│   │   ├── eventBus.ts
│   │   ├── reactive.ts
│   │   └── types.ts
│   ├── memory/
│   │   └── layers.ts
│   └── ...
├── components/
│   ├── AgentOrb
│   ├── AgentDock
│   ├── Chat
│   ├── VisionPanel
│   ├── CanvasBoard
│   ├── PythonREPL
│   └── ...
└── ...

e2e/
└── smoke.mjs

.github/
└── workflows/
    └── build.yml
```

## 🔌 Extensibility

FrontendAI is intended to grow through modules instead of rewrites.

A feature can contribute:

- A tool
- A context provider
- A UI component
- Events
- Permissions
- Task/runtime integrations
- Memory capabilities

This keeps the core runtime stable while allowing new frontend capabilities to become agent-accessible.

## 🗺️ Project Direction

The long-term goal is a frontend where AI is a **native participant in the interface**:

```
Traditional app:
User → UI → Backend

FrontendAI:
User ↔ UI ↔ Agent
          ↕
     Context / Tools
          ↕
    Runtime / Memory
          ↕
      Model Layer
```

The model is replaceable. The frontend environment, structured context, tools, events, memory, task lifecycle, and human controls form the durable agent platform.

## 📜 Evolution

- **V1** — Core ReAct loop, floating OS, IndexedDB vault, initial tools
- **V2** — Voice, vision, real embeddings
- **V3** — Memory graph, Whisper, BYOK vision, LLaVA
- **V4** — Companion behavior, infinite canvas, Python WASM
- **Current architecture** — Structured environment context, typed tool/runtime foundations, layered memory, permissions, task checkpoints, and browser-level validation

## 📄 License

See the repository for the project's current license and contribution information.
