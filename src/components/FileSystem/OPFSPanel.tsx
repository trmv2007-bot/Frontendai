import { useEffect, useState } from 'react'
import { useOPFS } from '../../hooks/useOPFS'
import { HardDrive, File, Folder, FilePlus, Trash2, Save, RefreshCw, Download, Database, Zap } from 'lucide-react'
import { db } from '../../agent/memory/db'

export function OPFSPanel() {
  const opfs = useOPFS()
  const [selectedFile, setSelectedFile] = useState<{ name: string, content: string } | null>(null)
  const [editContent, setEditContent] = useState('')
  const [newFileName, setNewFileName] = useState('')

  useEffect(() => {
    opfs.listFiles()
  }, [])

  const handleFileClick = async (name: string) => {
    const result = await opfs.readFile(name)
    if (result) {
      setSelectedFile(result)
      setEditContent(result.content)
    }
  }

  const handleSave = async () => {
    if (!selectedFile) return
    await opfs.writeFile(selectedFile.name, editContent)
  }

  const handleCreate = async () => {
    const name = newFileName || prompt('File name:')
    if (!name) return
    const content = prompt('Content:') || ''
    await opfs.writeFile(name, content)
    setNewFileName('')
  }

  const exportVault = async () => {
    const mems = await db.memories.toArray()
    const notes = await db.notes.toArray()
    const tasks = await db.tasks.toArray()
    
    await opfs.writeFile('memories.json', JSON.stringify(mems, null, 2))
    await opfs.writeFile('notes.json', JSON.stringify(notes, null, 2))
    await opfs.writeFile('tasks.json', JSON.stringify(tasks, null, 2))
    await opfs.writeFile('canvas.json', localStorage.getItem('frontendai_canvas') || '[]')
    await opfs.writeFile('README.md', `# FrontendAI OPFS Vault\nExported ${new Date().toISOString()}\n\n- ${mems.length} memories\n- ${notes.length} notes\n- ${tasks.length} tasks\n\nStored in Origin Private File System (OPFS) — private, persistent, no permission prompt, 100% frontend.`)
    
    alert('Exported vault to OPFS!')
  }

  const formatSize = (bytes?: number) => {
    if (!bytes) return '0B'
    if (bytes < 1024) return `${bytes}B`
    if (bytes < 1024*1024) return `${(bytes/1024).toFixed(1)}KB`
    return `${(bytes/(1024*1024)).toFixed(1)}MB`
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="shrink-0 p-3 border-b border-[#1e1e2e] space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
            <Database className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-[13px] font-medium">OPFS Vault • Private File System • No Permission</h3>
            <p className="text-[11px] text-zinc-500">Origin Private File System — private, persistent, always available, 100% frontend</p>
          </div>
          {opfs.quota && (
            <div className="text-right">
              <div className="text-[11px] font-mono text-zinc-400">{formatSize(opfs.quota.usage)} / {formatSize(opfs.quota.quota)}</div>
              <div className="w-20 h-1 rounded-full bg-[#1a1a26] mt-1 overflow-hidden">
                <div className="h-full bg-violet-500" style={{ width: `${Math.min(100, (opfs.quota.usage/opfs.quota.quota)*100)}%` }} />
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <button onClick={() => opfs.listFiles()} className="h-9 px-4 rounded-full bg-white text-black text-[12px] font-medium flex items-center gap-1.5 hover:bg-zinc-200">
            <RefreshCw className={`w-4 h-4 ${opfs.isLoading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <div className="flex items-center gap-1 p-1 rounded-full bg-[#1a1a26] border border-[#2a2a3e]">
            <input
              value={newFileName}
              onChange={e=>setNewFileName(e.target.value)}
              placeholder="new file name"
              className="w-32 h-7 px-3 rounded-full bg-[#12121a] border border-[#1e1e2e] text-[11px] focus:outline-none"
            />
            <button onClick={handleCreate} className="w-7 h-7 rounded-full bg-violet-600 hover:bg-violet-500 text-white flex items-center justify-center">
              <FilePlus className="w-4 h-4" />
            </button>
          </div>
          <button onClick={exportVault} className="h-9 px-3 rounded-full bg-violet-600/20 border border-violet-500/20 text-violet-300 text-[12px] flex items-center gap-1.5">
            <Download className="w-4 h-4" /> Export vault to OPFS
          </button>
          <button onClick={() => opfs.clearAll()} className="h-9 px-3 rounded-full bg-red-500/10 border border-red-500/20 text-red-300 text-[12px] flex items-center gap-1.5">
            <Trash2 className="w-4 h-4" /> Clear OPFS
          </button>
        </div>

        {!opfs.isSupported && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[12px] text-amber-300">
            OPFS not supported in this browser. Try Chrome/Edge 102+.
          </div>
        )}

        {opfs.error && (
          <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/20 text-[11px] text-red-300">{opfs.error}</div>
        )}
      </div>

      <div className="flex-1 grid grid-cols-2 min-h-0">
        <div className="border-r border-[#1e1e2e] overflow-y-auto p-2 space-y-1">
          {opfs.files.length === 0 ? (
            <div className="py-12 text-center">
              <HardDrive className="w-8 h-8 mx-auto text-zinc-700 mb-2" />
              <p className="text-[13px] text-zinc-600">OPFS empty</p>
              <p className="text-[11px] text-zinc-700 mt-1">Private FS per origin, persistent, no permission. Create file or export vault.</p>
            </div>
          ) : (
            opfs.files.map(entry => (
              <div key={entry.name} className="group flex items-center gap-2 p-2.5 rounded-xl bg-[#1a1a26] border border-[#2a2a3e] hover:border-[#3a3a4e]">
                <button
                  onClick={() => entry.kind === 'file' && handleFileClick(entry.name)}
                  className="flex-1 flex items-center gap-2.5 text-left"
                >
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center ${entry.kind==='directory' ? 'bg-blue-500/20 text-blue-400' : 'bg-[#232334] text-zinc-500'}`}>
                    {entry.kind === 'directory' ? <Folder className="w-4 h-4" /> : <File className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium text-zinc-300 truncate">{entry.name}</div>
                    <div className="text-[10px] font-mono text-zinc-600">{entry.kind} {entry.size ? `• ${formatSize(entry.size)}` : ''}</div>
                  </div>
                </button>
                {entry.kind === 'file' && (
                  <button onClick={() => opfs.deleteFile(entry.name)} className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-full bg-[#232334] hover:bg-red-500/20 flex items-center justify-center text-zinc-500 hover:text-red-400 transition-all">
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        <div className="flex flex-col min-h-0">
          {selectedFile ? (
            <>
              <div className="shrink-0 p-2 border-b border-[#1e1e2e] flex items-center justify-between">
                <span className="text-[12px] font-medium text-zinc-300 flex items-center gap-2"><File className="w-4 h-4" />{selectedFile.name} • {formatSize(selectedFile.content.length)}</span>
                <button onClick={handleSave} className="px-3 h-7 rounded-full bg-white text-black text-[11px] font-medium flex items-center gap-1"><Save className="w-3 h-3" /> Save</button>
              </div>
              <textarea
                value={editContent}
                onChange={e=>setEditContent(e.target.value)}
                className="flex-1 w-full p-3 bg-[#0a0a0f] text-[12px] font-mono text-zinc-300 focus:outline-none resize-none"
                spellCheck={false}
              />
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center p-6 text-center">
              <div>
                <Database className="w-10 h-10 mx-auto text-zinc-700 mb-3" />
                <p className="text-[13px] text-zinc-500">Select file to view</p>
                <p className="text-[11px] text-zinc-600 mt-1 max-w-[240px]">OPFS is private per origin, not visible to user, but persistent. Great for model cache, vault backup.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="shrink-0 p-3 border-t border-[#1e1e2e] bg-violet-500/5">
        <h4 className="text-[11px] font-medium text-violet-300 flex items-center gap-1.5"><Zap className="w-3 h-3" />OPFS vs File System Access API</h4>
        <ul className="mt-1.5 text-[11px] text-zinc-500 leading-relaxed list-disc pl-4 space-y-0.5">
          <li><b>OPFS</b>: Private, per-origin, no permission prompt, always available, not visible in OS file explorer. Good for cache.</li>
          <li><b>FS Access API</b>: Real files on disk, needs user pick, visible, permission. Good for user vault.</li>
          <li>Both 100% frontend, no server. Use OPFS for model cache (transformers, WebLLM), FS API for user files.</li>
        </ul>
      </div>
    </div>
  )
}
