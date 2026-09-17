import { useState, useRef } from 'react'
import { usePyodide } from '../hooks/usePyodide'
import { Play, Trash2, Package, Sparkles, Terminal, Loader2 } from 'lucide-react'

export function PythonREPL() {
  const py = usePyodide()
  const [code, setCode] = useState(`# Python 3.12 in browser via Pyodide (WASM)
# 100% local, no server
import math
print("Hello from FrontendAI Python!")

# Try numpy, pandas, etc (auto-install via micropip)
# import numpy as np
# print(np.array([1,2,3]) * 2)

for i in range(5):
    print(f"Count {i}: {math.sqrt(i):.2f}")

# Agent can call executePython tool
`)
  const [pkg, setPkg] = useState('')
  const outputRef = useRef<HTMLDivElement>(null)

  const run = async () => {
    await py.runPython(code)
    setTimeout(() => outputRef.current?.scrollTo({ top: outputRef.current.scrollHeight, behavior: 'smooth' }), 100)
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#050508]">
      <div className="shrink-0 p-2 border-b border-[#1e1e2e] flex items-center gap-2">
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#1a1a26] border border-[#2a2a3e]">
          <Terminal className="w-4 h-4 text-emerald-400" />
          <span className="text-[12px] font-medium text-zinc-300">Python 3.12 • Pyodide WASM</span>
          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono border ${
            py.status === 'ready' ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' :
            py.status === 'loading' || py.status === 'running' ? 'bg-amber-500/10 text-amber-300 border-amber-500/20 animate-pulse' :
            'bg-[#232334] text-zinc-500 border-[#2a2a3e]'
          }`}>{py.status}</span>
        </div>

        <div className="flex items-center gap-1 ml-auto">
          <div className="flex items-center gap-1 p-1 rounded-full bg-[#1a1a26] border border-[#2a2a3e]">
            <input
              value={pkg}
              onChange={e=>setPkg(e.target.value)}
              placeholder="package"
              className="w-24 h-7 px-2 rounded-full bg-[#12121a] border border-[#1e1e2e] text-[11px] focus:outline-none"
            />
            <button
              onClick={() => pkg && py.installPackage(pkg)}
              disabled={!py.isReady || !pkg}
              className="px-3 h-7 rounded-full bg-violet-600 hover:bg-violet-500 text-white text-[11px] font-medium flex items-center gap-1 disabled:opacity-50"
            >
              <Package className="w-3 h-3" /> pip
            </button>
          </div>
          <button onClick={py.clearOutput} className="w-8 h-8 rounded-full bg-[#1a1a26] border border-[#2a2a3e] flex items-center justify-center text-zinc-500 hover:text-white"><Trash2 className="w-4 h-4" /></button>
          <button
            onClick={run}
            disabled={py.isLoading}
            className="px-4 h-8 rounded-full bg-white text-black text-[12px] font-medium flex items-center gap-1.5 hover:bg-zinc-200 disabled:opacity-50"
          >
            {py.isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />} Run
          </button>
        </div>
      </div>

      {py.progress && (
        <div className="shrink-0 px-3 py-2 bg-[#12121a] border-b border-[#1e1e2e] flex items-center gap-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-500" />
          <span className="text-[11px] font-mono text-zinc-400 truncate">{py.progress}</span>
        </div>
      )}

      <div className="flex-1 grid grid-rows-2 min-h-0">
        <div className="relative min-h-0 border-b border-[#1e1e2e]">
          <textarea
            value={code}
            onChange={e=>setCode(e.target.value)}
            className="absolute inset-0 w-full h-full p-4 bg-[#0a0a0f] text-[13px] font-mono text-zinc-200 focus:outline-none resize-none"
            spellCheck={false}
            placeholder="# Write Python here..."
          />
          <div className="absolute bottom-2 right-2 px-2 py-1 rounded-full bg-black/60 border border-white/10 text-[10px] font-mono text-zinc-500">
            {code.length} chars • Agent tool: executePython
          </div>
        </div>

        <div ref={outputRef} className="relative min-h-0 overflow-y-auto bg-[#050508] p-4 font-mono text-[12px] leading-relaxed">
          {py.output.length === 0 ? (
            <div className="py-10 text-center">
              <Terminal className="w-8 h-8 mx-auto text-zinc-700 mb-2" />
              <p className="text-[13px] text-zinc-600">Output will appear here</p>
              <p className="text-[11px] text-zinc-700 mt-1">Try running the sample code</p>
            </div>
          ) : (
            <div className="space-y-1">
              {py.output.map((line, i) => (
                <div key={i} className="whitespace-pre-wrap break-words text-zinc-300">{line}</div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="shrink-0 p-3 border-t border-[#1e1e2e] bg-violet-500/5">
        <h4 className="text-[11px] font-medium text-violet-300 flex items-center gap-1.5"><Sparkles className="w-3 h-3" />Python in frontend — how it works</h4>
        <ul className="mt-1.5 text-[11px] text-zinc-500 leading-relaxed list-disc pl-4 space-y-0.5">
          <li><b>Pyodide</b>: CPython 3.12 compiled to WASM, runs in browser, 10MB + stdlib</li>
          <li><b>micropip</b>: Install pure Python packages (numpy, pandas, etc) via CDN, no server</li>
          <li><b>Tool</b>: Agent can call <code className="px-1 py-0.5 rounded bg-[#1a1a26] border border-[#2a2a3e]">executePython</code> to run code</li>
          <li><b>Offline</b>: After first load, cached, works offline</li>
        </ul>
      </div>
    </div>
  )
}
