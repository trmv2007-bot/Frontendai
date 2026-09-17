import { useState } from 'react'
import { useFileSystem } from '../../hooks/useFileSystem'
import { FolderOpen, File, FilePlus, Save, RefreshCw, HardDrive, AlertCircle, Download, FileText } from 'lucide-react'
import { db } from '../../agent/memory/db'

export function FileVault() {
  const fs = useFileSystem()
  const [selectedFile, setSelectedFile] = useState<{ name: string, content: string } | null>(null)
  const [editContent, setEditContent] = useState('')

  const handleFileClick = async (entry: any) => {
    if (entry.kind === 'directory') {
      // For simplicity, we don't navigate into subdirs in MVP, just list
      return
    }
    const result = await fs.readFile(entry.handle)
    if (result) {
      setSelectedFile(result)
      setEditContent(result.content)
    }
  }

  const handleSave = async () => {
    if (!selectedFile) return
    const ok = await fs.writeFile(selectedFile.name, editContent)
    if (ok) {
      setSelectedFile({ ...selectedFile, content: editContent })
    }
  }

  const exportVaultToFiles = async () => {
    if (!fs.currentDir) {
      alert('Pick a directory first!')
      return
    }

    const mems = await db.memories.toArray()
    const notes = await db.notes.toArray()
    const tasks = await db.tasks.toArray()

    await fs.writeFile('memories.json', JSON.stringify(mems, null, 2))
    await fs.writeFile('notes.json', JSON.stringify(notes, null, 2))
    await fs.writeFile('tasks.json', JSON.stringify(tasks, null, 2))
    await fs.writeFile('README.md', `# FrontendAI Vault Export\nExported ${new Date().toISOString()}\n\n- ${mems.length} memories\n- ${notes.length} notes\n- ${tasks.length} tasks\n\nThis is 100% local, no server.`)

    alert('Exported vault to selected directory!')
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="shrink-0 p-3 border-b border-[#1e1e2e] space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
            <HardDrive className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-[13px] font-medium">File System Vault • Real Files, No Server</h3>
            <p className="text-[11px] text-zinc-500">Uses File System Access API — Chrome/Edge, local only</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => fs.pickDirectory()}
            className="h-9 px-4 rounded-full bg-white text-black text-[12px] font-medium flex items-center gap-1.5 hover:bg-zinc-200"
          >
            <FolderOpen className="w-4 h-4" /> {fs.currentDir ? 'Change dir' : 'Pick directory'}
          </button>
          <button
            onClick={() => fs.listFiles()}
            disabled={!fs.currentDir || fs.isLoading}
            className="h-9 px-3 rounded-full bg-[#1a1a26] border border-[#2a2a3e] text-[12px] flex items-center gap-1.5 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${fs.isLoading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button
            onClick={() => fs.createFile()}
            disabled={!fs.currentDir}
            className="h-9 px-3 rounded-full bg-[#1a1a26] border border-[#2a2a3e] text-[12px] flex items-center gap-1.5 disabled:opacity-50"
          >
            <FilePlus className="w-4 h-4" /> New file
          </button>
          <button
            onClick={exportVaultToFiles}
            disabled={!fs.currentDir}
            className="h-9 px-3 rounded-full bg-violet-600/20 border border-violet-500/20 text-violet-300 text-[12px] flex items-center gap-1.5 disabled:opacity-50"
          >
            <Download className="w-4 h-4" /> Export vault to folder
          </button>
        </div>

        {fs.currentPath && (
          <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-500 px-3 py-2 rounded-xl bg-[#1a1a26] border border-[#2a2a3e]">
            <FolderOpen className="w-3.5 h-3.5" /> {fs.currentPath} • {fs.files.length} entries
          </div>
        )}

        {!fs.isSupported && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-[12px] text-amber-300">
              File System Access API not supported in this browser. Try Chrome/Edge. Fallback to download/upload will be used.
              <div className="mt-2 flex gap-2">
                <button onClick={async () => {
                  const f = await fs.pickFile()
                  if (f) { setSelectedFile(f); setEditContent(f.content) }
                }} className="px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-200 text-[11px]">Pick file (fallback)</button>
              </div>
            </div>
          </div>
        )}

        {fs.error && (
          <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/20 text-[11px] text-red-300">{fs.error}</div>
        )}
      </div>

      <div className="flex-1 grid grid-cols-2 min-h-0">
        {/* file list */}
        <div className="border-r border-[#1e1e2e] overflow-y-auto p-2 space-y-1">
          {fs.files.length === 0 ? (
            <div className="py-12 text-center">
              <FolderOpen className="w-8 h-8 mx-auto text-zinc-700 mb-2" />
              <p className="text-[13px] text-zinc-600">No directory selected</p>
              <p className="text-[11px] text-zinc-700 mt-1">Pick a folder to see real files from your disk, 100% local</p>
            </div>
          ) : (
            fs.files.map(entry => (
              <button
                key={entry.name}
                onClick={() => handleFileClick(entry)}
                className={`w-full text-left p-2.5 rounded-xl flex items-center gap-2.5 border transition-colors ${
                  selectedFile?.name === entry.name ? 'bg-violet-600/10 border-violet-500/20 text-violet-200' : 'bg-[#1a1a26] border-[#2a2a3e] hover:border-[#3a3a4e] text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center ${entry.kind==='directory' ? 'bg-blue-500/20 text-blue-400' : 'bg-[#232334] text-zinc-500'}`}>
                  {entry.kind === 'directory' ? <FolderOpen className="w-4 h-4" /> : <File className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium truncate">{entry.name}</div>
                  <div className="text-[10px] font-mono opacity-60">
                    {entry.kind} {entry.size ? `• ${Math.round(entry.size/1024)}KB` : ''} {entry.lastModified ? `• ${new Date(entry.lastModified).toLocaleDateString()}` : ''}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>

        {/* file preview/editor */}
        <div className="flex flex-col min-h-0">
          {selectedFile ? (
            <>
              <div className="shrink-0 p-2 border-b border-[#1e1e2e] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-zinc-500" />
                  <span className="text-[12px] font-medium text-zinc-300">{selectedFile.name}</span>
                  <span className="text-[10px] font-mono text-zinc-600">{selectedFile.content.length} chars</span>
                </div>
                <div className="flex gap-1">
                  <button onClick={handleSave} className="px-3 h-7 rounded-full bg-white text-black text-[11px] font-medium flex items-center gap-1"><Save className="w-3 h-3" /> Save</button>
                  <button onClick={() => fs.saveFile(selectedFile.name, editContent)} className="w-7 h-7 rounded-full bg-[#1a1a26] border border-[#2a2a3e] flex items-center justify-center text-zinc-500"><Download className="w-3.5 h-3.5" /></button>
                </div>
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
                <FileText className="w-10 h-10 mx-auto text-zinc-700 mb-3" />
                <p className="text-[13px] text-zinc-500">Select a file to view/edit</p>
                <p className="text-[11px] text-zinc-600 mt-1 max-w-[240px]">Real files from your disk, edited locally, saved directly to disk via File System Access API. No upload.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="shrink-0 p-3 border-t border-[#1e1e2e] bg-blue-500/5">
        <h4 className="text-[11px] font-medium text-blue-300">How it works — 100% frontend</h4>
        <ul className="mt-1.5 text-[11px] text-zinc-500 leading-relaxed list-disc pl-4 space-y-0.5">
          <li><b>showDirectoryPicker</b>: User picks folder, browser grants read/write, no server</li>
          <li><b>OPFS</b>: Origin Private File System for private cache, alternative to real FS</li>
          <li><b>Fallback</b>: If API not supported, uses download/upload via blob URLs</li>
          <li><b>Vault export</b>: Dumps IndexedDB memories/notes/tasks as JSON files to picked folder</li>
        </ul>
      </div>
    </div>
  )
}
