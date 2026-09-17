import { useState, useRef } from 'react'
import { Terminal, Play, Package, Loader2, AlertCircle, Box, Zap, Download } from 'lucide-react'

export function WebContainerPanel() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'running' | 'error'>('idle')
  const [progress, setProgress] = useState('')
  const [output, setOutput] = useState<string[]>([])
  const [code, setCode] = useState(`// WebContainer — Node.js in browser via StackBlitz
// Full Node, npm, file system, no server
// Requires COOP/COEP headers (Cross-Origin Isolated)

console.log("Hello from WebContainer Node.js!");
console.log("Node version:", process.version);

// Try file system
import { writeFile, readFile } from 'fs/promises';
await writeFile('/tmp/hello.txt', 'Hello from OPFS-like FS in WebContainer!');
const content = await readFile('/tmp/hello.txt', 'utf-8');
console.log("File content:", content);

// Try npm package (if network allowed)
// import { exec } from 'child_process';
// exec('npm install lodash', (err, stdout) => console.log(stdout));

// Agent can call executeNode tool
`)

  const webcontainerRef = useRef<any>(null)

  const boot = async () => {
    setStatus('loading')
    setProgress('Booting WebContainer... (needs COOP/COEP headers)')

    try {
      // Check if cross-origin isolated
      if (!crossOriginIsolated) {
        setProgress('Not cross-origin isolated. WebContainers need COOP/COEP headers. Using fallback JS runtime for now.')
        setStatus('error')
        setOutput(prev => [...prev, '⚠️ Not cross-origin isolated. WebContainers require headers:', 'Cross-Origin-Embedder-Policy: require-corp', 'Cross-Origin-Opener-Policy: same-origin', '', 'For now, using JS sandbox fallback. Add headers in vite.config.ts server.headers and reload.'])
        return
      }

      // @ts-ignore
      const { WebContainer } = await import('@webcontainer/api')
      
      setProgress('Booting container...')
      const wc = await WebContainer.boot()
      webcontainerRef.current = wc

      // Mount files
      await wc.mount({
        'index.js': { file: { contents: code } },
        'package.json': { file: { contents: JSON.stringify({ name: 'frontendai-wc', type: 'module' }, null, 2) } }
      })

      setStatus('ready')
      setProgress('WebContainer ready — Node.js in browser!')
      setOutput(prev => [...prev, '✅ WebContainer booted', 'Node.js running in browser, no server'])

    } catch (e: any) {
      console.error('WebContainer boot failed', e)
      setStatus('error')
      setProgress(`Boot failed: ${e.message}`)
      setOutput(prev => [...prev, `Error: ${e.message}`, '', 'Fallback: Use Python WASM or JS sandbox tools which work without COOP/COEP.'])
    }
  }

  const run = async () => {
    if (status !== 'ready' || !webcontainerRef.current) {
      // Fallback to JS execution
      setOutput(prev => [...prev, `>>> ${code.slice(0,100)}...`, 'Running in JS fallback (WebContainer not ready)...'])
      try {
        const logs: string[] = []
        const fakeConsole = { log: (...args: any[]) => logs.push(args.map(a=>typeof a==='object'?JSON.stringify(a):String(a)).join(' ')) }
        const fn = new Function('console', `"use strict"; ${code}`)
        const result = fn(fakeConsole)
        setOutput(prev => [...prev, ...logs, result !== undefined ? `Result: ${result}` : 'Done (JS fallback)'])
      } catch (e: any) {
        setOutput(prev => [...prev, `Error: ${e.message}`])
      }
      return
    }

    setStatus('running')
    setOutput(prev => [...prev, `>>> Running index.js`])

    try {
      const wc = webcontainerRef.current
      await wc.fs.writeFile('/index.js', code)
      
      const process = await wc.spawn('node', ['index.js'])
      
      process.output.pipeTo(new WritableStream({
        write(data) {
          setOutput(prev => [...prev, data])
        }
      }))

      const exitCode = await process.exit
      setOutput(prev => [...prev, `Process exited with code ${exitCode}`])
      setStatus('ready')
    } catch (e: any) {
      setOutput(prev => [...prev, `Run failed: ${e.message}`])
      setStatus('ready')
    }
  }

  const installPkg = async (pkg: string) => {
    if (status !== 'ready' || !webcontainerRef.current) {
      setOutput(prev => [...prev, `Cannot install ${pkg} — WebContainer not ready`])
      return
    }

    setStatus('running')
    setOutput(prev => [...prev, `Installing ${pkg} via npm...`])

    try {
      const wc = webcontainerRef.current
      const proc = await wc.spawn('npm', ['install', pkg])
      proc.output.pipeTo(new WritableStream({
        write(data) { setOutput(prev => [...prev, data]) }
      }))
      await proc.exit
      setStatus('ready')
    } catch (e: any) {
      setOutput(prev => [...prev, `Install failed: ${e.message}`])
      setStatus('ready')
    }
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#050508]">
      <div className="shrink-0 p-2 border-b border-[#1e1e2e] flex items-center gap-2">
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#1a1a26] border border-[#2a2a3e]">
          <Box className="w-4 h-4 text-fuchsia-400" />
          <span className="text-[12px] font-medium text-zinc-300">WebContainer • Node.js in Browser</span>
          <span className={`px-1.5 py-0.5 rounded-full text-[10px] border ${
            status==='ready' ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' :
            status==='loading' || status==='running' ? 'bg-amber-500/10 text-amber-300 border-amber-500/20 animate-pulse' :
            'bg-[#232334] text-zinc-500 border-[#2a2a3e]'
          }`}>{status}</span>
        </div>

        <div className="ml-auto flex items-center gap-1">
          <button onClick={boot} disabled={status==='loading'} className="h-8 px-3 rounded-full bg-violet-600 hover:bg-violet-500 text-white text-[12px] font-medium flex items-center gap-1.5 disabled:opacity-50">
            {status==='loading' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />} {status==='idle' ? 'Boot' : status==='ready' ? 'Reboot' : 'Booting...'}
          </button>
          <button onClick={run} disabled={status==='loading'} className="h-8 px-4 rounded-full bg-white text-black text-[12px] font-medium flex items-center gap-1.5 disabled:opacity-50">
            <Play className="w-3.5 h-3.5" /> Run
          </button>
        </div>
      </div>

      {progress && (
        <div className="shrink-0 px-3 py-2 bg-[#12121a] border-b border-[#1e1e2e] flex items-center gap-2">
          {status==='loading' || status==='running' ? <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-500" /> : <AlertCircle className="w-3.5 h-3.5 text-amber-500" />}
          <span className="text-[11px] font-mono text-zinc-400 truncate">{progress}</span>
          <span className="ml-auto text-[10px] font-mono text-zinc-600">crossOriginIsolated: {crossOriginIsolated ? 'yes' : 'no'}</span>
        </div>
      )}

      <div className="flex-1 grid grid-rows-2 min-h-0">
        <div className="relative min-h-0 border-b border-[#1e1e2e]">
          <textarea
            value={code}
            onChange={e=>setCode(e.target.value)}
            className="absolute inset-0 w-full h-full p-4 bg-[#0a0a0f] text-[13px] font-mono text-zinc-200 focus:outline-none resize-none"
            spellCheck={false}
          />
        </div>

        <div className="relative min-h-0 overflow-y-auto bg-[#050508] p-4 font-mono text-[12px] leading-relaxed">
          {output.length === 0 ? (
            <div className="py-10 text-center">
              <Box className="w-8 h-8 mx-auto text-zinc-700 mb-2" />
              <p className="text-[13px] text-zinc-600">WebContainer output</p>
              <p className="text-[11px] text-zinc-700 mt-1">Boot container to run Node.js in browser, no server. Needs COOP/COEP headers.</p>
              <div className="mt-4 p-3 rounded-xl bg-amber-500/5 border border-amber-500/10 text-left max-w-[400px] mx-auto">
                <p className="text-[11px] text-amber-300 font-medium">Why headers needed?</p>
                <p className="text-[11px] text-zinc-500 mt-1">WebContainers use SharedArrayBuffer which requires cross-origin isolation. Add in vite.config.ts:</p>
                <pre className="mt-2 p-2 rounded bg-black/50 text-[10px] text-zinc-400 overflow-x-auto">
{`headers: {
  'Cross-Origin-Embedder-Policy': 'require-corp',
  'Cross-Origin-Opener-Policy': 'same-origin'
}`}
                </pre>
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              {output.map((line, i) => (
                <div key={i} className="whitespace-pre-wrap break-words text-zinc-300">{line}</div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="shrink-0 p-3 border-t border-[#1e1e2e] bg-fuchsia-500/5">
        <h4 className="text-[11px] font-medium text-fuchsia-300">WebContainers — how it works (frontend)</h4>
        <ul className="mt-1.5 text-[11px] text-zinc-500 leading-relaxed list-disc pl-4 space-y-0.5">
          <li><b>StackBlitz WebContainers</b>: Full Node.js, npm, file system in browser via WASM, no server</li>
          <li><b>COOP/COEP</b>: Requires cross-origin isolated context (SharedArrayBuffer), set headers</li>
          <li><b>Fallback</b>: If not isolated, uses JS sandbox — still 100% frontend</li>
          <li><b>Tool</b>: Agent can call <code className="px-1 py-0.5 rounded bg-[#1a1a26] border border-[#2a2a3e]">executeNode</code> (future)</li>
        </ul>
      </div>
    </div>
  )
}
