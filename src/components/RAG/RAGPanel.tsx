import { useEffect, useState } from 'react'
import { queryRAG, indexFile, clearRAG, getRAGStats, buildRAGContext, ragDb } from '../../agent/rag/fileRAG'
import { useOPFS } from '../../hooks/useOPFS'
import { useFileSystem } from '../../hooks/useFileSystem'
import { db } from '../../agent/memory/db'
import { Search, Database, FileText, Trash2, Upload, Sparkles, Zap, Loader2 } from 'lucide-react'

export function RAGPanel() {
  const opfs = useOPFS()
  const fs = useFileSystem()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [stats, setStats] = useState({ totalChunks: 0, totalFiles: 0, avgChunkSize: 0, files: [] as string[] })
  const [isIndexing, setIsIndexing] = useState(false)
  const [progress, setProgress] = useState('')
  const [context, setContext] = useState('')

  const loadStats = async () => {
    const s = await getRAGStats()
    setStats(s)
  }

  useEffect(() => {
    loadStats()
    opfs.listFiles()
  }, [])

  const indexOPFS = async () => {
    setIsIndexing(true)
    setProgress('Reading OPFS files...')
    try {
      const files = []
      for (const entry of opfs.files) {
        if (entry.kind === 'file') {
          const result = await opfs.readFile(entry.name)
          if (result) files.push(result)
        }
      }

      setProgress(`Indexing ${files.length} files...`)
      for (const file of files) {
        await indexFile(file.name, file.content, '/opfs/', ['opfs'])
      }

      setProgress(`Indexed ${files.length} files from OPFS`)
      await loadStats()
    } catch (e: any) {
      setProgress(`Failed: ${e.message}`)
    }
    setIsIndexing(false)
  }

  const indexNotes = async () => {
    setIsIndexing(true)
    setProgress('Indexing notes vault...')
    try {
      const notes = await db.notes.toArray()
      for (const note of notes) {
        await indexFile(note.title, note.content, '/notes/', ['notes', ...note.tags])
      }
      setProgress(`Indexed ${notes.length} notes`)
      await loadStats()
    } catch (e: any) {
      setProgress(`Failed: ${e.message}`)
    }
    setIsIndexing(false)
  }

  const indexMemories = async () => {
    setIsIndexing(true)
    setProgress('Indexing memories...')
    try {
      const mems = await db.memories.toArray()
      for (const mem of mems) {
        await indexFile(`memory-${mem.id}`, mem.content, '/memories/', ['memory', ...mem.tags])
      }
      setProgress(`Indexed ${mems.length} memories`)
      await loadStats()
    } catch (e: any) {
      setProgress(`Failed: ${e.message}`)
    }
    setIsIndexing(false)
  }

  const handleQuery = async () => {
    if (!query.trim()) return
    setProgress(`Searching for "${query}"...`)
    try {
      const res = await queryRAG(query, 5)
      setResults(res)
      
      const ctx = await buildRAGContext(query, 5)
      setContext(ctx)
      setProgress(`Found ${res.length} relevant chunks`)
    } catch (e: any) {
      setProgress(`Search failed: ${e.message}`)
    }
  }

  const handleFileUpload = async (file: File) => {
    setIsIndexing(true)
    setProgress(`Indexing ${file.name}...`)
    try {
      const content = await file.text()
      await indexFile(file.name, content, '/upload/', ['upload'])
      setProgress(`Indexed ${file.name} (${Math.round(content.length/1024)}KB)`)
      await loadStats()
    } catch (e: any) {
      setProgress(`Failed: ${e.message}`)
    }
    setIsIndexing(false)
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="shrink-0 p-3 border-b border-[#1e1e2e] space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
            <Database className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-[13px] font-medium">RAG over Files • OPFS + Notes + Memories • Vector Search</h3>
            <p className="text-[11px] text-zinc-500">Chunk files, embed 384-dim, query via cosine similarity, 100% frontend</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="p-2 rounded-xl bg-[#1a1a26] border border-[#2a2a3e] text-center">
            <div className="text-[16px] font-bold text-white">{stats.totalChunks}</div>
            <div className="text-[10px] uppercase tracking-wide text-zinc-500">Chunks</div>
          </div>
          <div className="p-2 rounded-xl bg-[#1a1a26] border border-[#2a2a3e] text-center">
            <div className="text-[16px] font-bold text-emerald-400">{stats.totalFiles}</div>
            <div className="text-[10px] uppercase tracking-wide text-zinc-500">Files</div>
          </div>
          <div className="p-2 rounded-xl bg-[#1a1a26] border border-[#2a2a3e] text-center">
            <div className="text-[16px] font-bold text-violet-400">{stats.avgChunkSize}</div>
            <div className="text-[10px] uppercase tracking-wide text-zinc-500">Avg size</div>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <button onClick={indexOPFS} disabled={isIndexing} className="h-8 px-3 rounded-full bg-violet-600/20 border border-violet-500/20 text-violet-300 text-[11px] flex items-center gap-1 disabled:opacity-50">
            {isIndexing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Database className="w-3 h-3" />} Index OPFS ({opfs.files.length})
          </button>
          <button onClick={indexNotes} disabled={isIndexing} className="h-8 px-3 rounded-full bg-emerald-600/20 border border-emerald-500/20 text-emerald-300 text-[11px] flex items-center gap-1 disabled:opacity-50">
            <FileText className="w-3 h-3" /> Index Notes
          </button>
          <button onClick={indexMemories} disabled={isIndexing} className="h-8 px-3 rounded-full bg-blue-600/20 border border-blue-500/20 text-blue-300 text-[11px] flex items-center gap-1 disabled:opacity-50">
            <Sparkles className="w-3 h-3" /> Index Memories
          </button>
          <label className="h-8 px-3 rounded-full bg-[#1a1a26] border border-[#2a2a3e] text-[11px] text-zinc-400 flex items-center gap-1 cursor-pointer hover:text-white">
            <Upload className="w-3 h-3" /> Upload & Index
            <input type="file" accept=".txt,.md,.json,.js,.ts,.py" className="hidden" onChange={e => e.target.files?.[0] && handleFileUpload(e.target.files[0])} />
          </label>
          <button onClick={async () => { await clearRAG(); loadStats(); setResults([]); setContext('') }} className="h-8 px-3 rounded-full bg-red-500/10 border border-red-500/20 text-red-300 text-[11px] flex items-center gap-1">
            <Trash2 className="w-3 h-3" /> Clear RAG
          </button>
        </div>

        <div className="flex gap-2">
          <input
            value={query}
            onChange={e=>setQuery(e.target.value)}
            onKeyDown={e=>e.key==='Enter' && handleQuery()}
            placeholder="Query files, e.g. 'how does memory work?'"
            className="flex-1 h-9 px-3 rounded-full bg-[#1a1a26] border border-[#2a2a3e] text-[12px] focus:outline-none focus:border-violet-500/50"
          />
          <button onClick={handleQuery} className="h-9 px-4 rounded-full bg-white text-black text-[12px] font-medium flex items-center gap-1.5">
            <Search className="w-3.5 h-3.5" /> Search
          </button>
        </div>

        {progress && (
          <div className="p-2 rounded-xl bg-[#1a1a26] border border-[#2a2a3e] text-[11px] font-mono text-zinc-400">{progress}</div>
        )}
      </div>

      <div className="flex-1 grid grid-rows-2 min-h-0">
        <div className="overflow-y-auto p-3 space-y-2 border-b border-[#1e1e2e]">
          <h4 className="text-[11px] font-medium uppercase tracking-widest text-zinc-500">Results • {results.length}</h4>
          {results.length === 0 ? (
            <div className="py-8 text-center">
              <Search className="w-6 h-6 mx-auto text-zinc-700 mb-2" />
              <p className="text-[12px] text-zinc-600">No results. Index files first, then query.</p>
              <p className="text-[11px] text-zinc-700 mt-1">Uses real embeddings if loaded, else keyword search. 100% local.</p>
            </div>
          ) : (
            results.map((r, i) => (
              <div key={r.chunk.id} className="p-3 rounded-xl bg-[#1a1a26] border border-[#2a2a3e]">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-medium text-zinc-200">{r.chunk.fileName} • chunk {r.chunk.chunkIndex+1}/{r.chunk.totalChunks}</span>
                  <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[10px] font-mono">score {r.score.toFixed(3)}</span>
                </div>
                <div className="mt-2 text-[12px] text-zinc-400 leading-relaxed whitespace-pre-wrap">{r.chunk.content.slice(0,400)}</div>
                <div className="mt-2 flex gap-1">
                  {r.chunk.tags.map((t:string) => (
                    <span key={t} className="px-1.5 py-0.5 rounded-full bg-[#232334] border border-[#2a2a3e] text-[10px] text-zinc-500">{t}</span>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="overflow-y-auto p-3">
          <h4 className="text-[11px] font-medium uppercase tracking-widest text-zinc-500">RAG Context (for LLM)</h4>
          <pre className="mt-2 p-3 rounded-xl bg-[#0a0a0f] border border-[#1e1e2e] text-[11px] font-mono text-zinc-400 whitespace-pre-wrap leading-relaxed max-h-[300px] overflow-y-auto">
            {context || 'Query to build context for LLM. This context would be injected into prompt for answering.'}
          </pre>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => {
                if (context) navigator.clipboard.writeText(context)
              }}
              className="px-3 py-1.5 rounded-full bg-[#1a1a26] border border-[#2a2a3e] text-[11px] text-zinc-400 hover:text-white"
            >
              Copy context
            </button>
            <span className="text-[11px] text-zinc-600 self-center">Use in chat: paste context + question</span>
          </div>
        </div>
      </div>

      <div className="shrink-0 p-3 border-t border-[#1e1e2e] bg-emerald-500/5">
        <h4 className="text-[11px] font-medium text-emerald-300 flex items-center gap-1"><Zap className="w-3 h-3" />RAG — how it works (frontend)</h4>
        <ul className="mt-1.5 text-[11px] text-zinc-500 leading-relaxed list-disc pl-4 space-y-0.5">
          <li><b>Chunking</b>: Split files into 500 char chunks with 50 overlap</li>
          <li><b>Embedding</b>: Each chunk → 384-dim vector via all-MiniLM-L6-v2 (if loaded) or keyword fallback</li>
          <li><b>Storage</b>: Dexie `fileChunks` table, persistent</li>
          <li><b>Query</b>: Embed query → cosine similarity → topK chunks → build context</li>
          <li><b>LLM</b>: Inject context into prompt for answering — real RAG, 100% local</li>
        </ul>
      </div>
    </div>
  )
}
