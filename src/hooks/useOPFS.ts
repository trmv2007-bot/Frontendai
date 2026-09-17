import { useState, useCallback } from 'react'

type OPFSEntry = {
  name: string
  kind: 'file' | 'directory'
  size?: number
}

export function useOPFS() {
  const [isSupported, setIsSupported] = useState(() => 'storage' in navigator && 'getDirectory' in (navigator.storage as any))
  const [files, setFiles] = useState<OPFSEntry[]>([])
  const [currentPath, setCurrentPath] = useState<string>('/')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [quota, setQuota] = useState<{ usage: number, quota: number } | null>(null)

  const getRoot = useCallback(async () => {
    try {
      // @ts-ignore
      const root = await navigator.storage.getDirectory()
      return root
    } catch (e: any) {
      setError(e.message)
      return null
    }
  }, [])

  const listFiles = useCallback(async () => {
    try {
      setIsLoading(true)
      const root = await getRoot()
      if (!root) return

      const entries: OPFSEntry[] = []
      // @ts-ignore
      for await (const [name, handle] of root.entries()) {
        let size
        if (handle.kind === 'file') {
          try {
            const file = await handle.getFile()
            size = file.size
          } catch {}
        }
        entries.push({ name, kind: handle.kind, size })
      }

      setFiles(entries.sort((a,b) => {
        if (a.kind !== b.kind) return a.kind === 'directory' ? -1 : 1
        return a.name.localeCompare(b.name)
      }))

      // Get quota
      if (navigator.storage.estimate) {
        const est = await navigator.storage.estimate()
        setQuota({ usage: est.usage || 0, quota: est.quota || 0 })
      }

    } catch (e: any) {
      setError(e.message)
    } finally {
      setIsLoading(false)
    }
  }, [getRoot])

  const readFile = useCallback(async (name: string) => {
    try {
      const root = await getRoot()
      if (!root) return null
      const fileHandle = await root.getFileHandle(name)
      const file = await fileHandle.getFile()
      const content = await file.text()
      return { name, content, size: file.size }
    } catch (e: any) {
      setError(e.message)
      return null
    }
  }, [getRoot])

  const writeFile = useCallback(async (name: string, content: string) => {
    try {
      const root = await getRoot()
      if (!root) return false
      const fileHandle = await root.getFileHandle(name, { create: true })
      // @ts-ignore - OPFS file handle has createWritable
      const writable = await fileHandle.createWritable()
      await writable.write(content)
      await writable.close()
      await listFiles()
      return true
    } catch (e: any) {
      setError(e.message)
      return false
    }
  }, [getRoot, listFiles])

  const deleteFile = useCallback(async (name: string) => {
    try {
      const root = await getRoot()
      if (!root) return false
      await root.removeEntry(name)
      await listFiles()
      return true
    } catch (e: any) {
      setError(e.message)
      return false
    }
  }, [getRoot, listFiles])

  const createDirectory = useCallback(async (name: string) => {
    try {
      const root = await getRoot()
      if (!root) return false
      await root.getDirectoryHandle(name, { create: true })
      await listFiles()
      return true
    } catch (e: any) {
      setError(e.message)
      return false
    }
  }, [getRoot, listFiles])

  const clearAll = useCallback(async () => {
    if (!confirm('Delete all OPFS files?')) return false
    try {
      const root = await getRoot()
      if (!root) return false
      // @ts-ignore
      for await (const [name] of root.entries()) {
        await root.removeEntry(name, { recursive: true })
      }
      await listFiles()
      return true
    } catch (e: any) {
      setError(e.message)
      return false
    }
  }, [getRoot, listFiles])

  return {
    isSupported,
    files,
    currentPath,
    error,
    isLoading,
    quota,
    listFiles,
    readFile,
    writeFile,
    deleteFile,
    createDirectory,
    clearAll,
    getRoot
  }
}
