# FrontendAI OS — Chrome Extension

100% frontend AI OS that lives in any page. No backend, private, local.

## Features (same as PWA)

- Chat with ReAct loop + 21 tools
- Voice-to-voice real-time (VAD canvas)
- Vision (screenshot + captioning)
- Canvas whiteboard, Python Pyodide, Node WebContainers
- Files FS Access API, OPFS private FS
- P2P swarm, CRDT multi-tab sync (Yjs)
- Multi-agent team (5 personas), RAG over files, Voice clone
- Plugin marketplace (9 built-in + custom)
- PWA installable, offline via Workbox

## Install

1. Build:
   ```bash
   npm run build:ext
   # outputs extension/dist/ + dist/frontendai-os-extension.zip
   ```

2. Chrome:
   - Open `chrome://extensions`
   - Enable Developer mode
   - Load unpacked → select `extension/` folder
   - Or drag `frontendai-os-extension.zip` (after unzip)

3. Use:
   - Orb appears bottom-right on any page
   - Click orb or `Ctrl+Shift+O` to toggle
   - Click extension icon → Open Side Panel
   - `Esc` closes overlay

## Architecture

- `manifest.json` MV3: sidePanel, content_scripts <all_urls>, permissions storage/scripting/sidePanel
- `background.js`: service worker, handles sidePanel.open, commands toggle-os
- `content.js`: injects orb + iframe container, tries sidePanel first, fallback overlay
- `content.css`: orb + iframe styles (z-index 2147483647)
- `popup.html/js`: quick open, stats
- `sidepanel.html`: loads OS (extension/dist/index.html if exists, else localhost:5173 or app.html)
- `dist/`: bundled PWA (copied from root dist/ via build script)
- `app.html`: redirect to dist/index.html

## Why extension?

- OS everywhere: any website becomes your AI workspace
- Side panel: persistent, doesn't overlay content
- No backend: all IndexedDB, Yjs CRDT sync across tabs
- Privacy: no data leaves browser (unless you use BYOK APIs)

## Publish to Chrome Web Store

1. Zip extension/ (already done via build:ext)
2. Go to https://chrome.google.com/webstore/devconsole
3. Upload zip, fill listing, privacy policy (no data collection)
4. Submit

## Single File

```bash
npm run build:single
# dist/frontendai-os-single.html — open anywhere, no server
```

## All

```bash
npm run build:all
# PWA + single + extension
```

---

FrontendAI OS v9 — 100% frontend, no backend ever.
