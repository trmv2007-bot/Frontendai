import { useState, useCallback } from 'react'

type FileEntry = {
  name: string
  kind: 'file' | 'directory'
  handle?: any
  size?: number
  lastModified?: number
}

export function useFileSystem() {
  const [isSupported, setIsSupported] = useState(() => 'showDirectoryPicker' in window)
  const [currentDir, setCurrentDir] = useState<any>(null)
  const [files, setFiles] = useState<FileEntry[]>([])
  const [currentPath, setCurrentPath] = useState<string>('/')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const pickDirectory = useCallback(async () => {
    if (!('showDirectoryPicker' in window)) {
      setError('File System Access API not supported. Try Chrome/Edge.')
      return null
    }

    try {
      setIsLoading(true)
      // @ts-ignore
      const dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' })
      setCurrentDir(dirHandle)
      // @ts-ignore
      ;(window as any).__frontendai_dirHandle = dirHandle
      setCurrentPath('/' + dirHandle.name)
      await listFiles(dirHandle)
      return dirHandle
    } catch (e: any) {
      if (e.name !== 'AbortError') setError(e.message)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  const listFiles = useCallback(async (dirHandle: any = currentDir) => {
    if (!dirHandle) return
    try {
      setIsLoading(true)
      const entries: FileEntry[] = []
      // @ts-ignore
      for await (const [name, handle] of dirHandle.entries()) {
        let size, lastModified
        if (handle.kind === 'file') {
          try {
            const file = await handle.getFile()
            size = file.size
            lastModified = file.lastModified
          } catch {}
        }
        entries.push({ name, kind: handle.kind, handle, size, lastModified })
      }
      setFiles(entries.sort((a,b) => {
        if (a.kind !== b.kind) return a.kind === 'directory' ? -1 : 1
        return a.name.localeCompare(b.name)
      }))
    } catch (e: any) {
      setError(e.message)
    } finally {
      setIsLoading(false)
    }
  }, [currentDir])

  const readFile = useCallback(async (handle: any) => {
    try {
      const file = await handle.getFile()
      const text = await file.text()
      return { name: file.name, content: text, size: file.size, type: file.type }
    } catch (e: any) {
      setError(e.message)
      return null
    }
  }, [])

  const writeFile = useCallback(async (name: string, content: string) => {
    if (!currentDir) {
      setError('No directory selected')
      return false
    }
    try {
      const fileHandle = await currentDir.getFileHandle(name, { create: true })
      const writable = await fileHandle.createWritable()
      await writable.write(content)
      await writable.close()
      await listFiles()
      return true
    } catch (e: any) {
      setError(e.message)
      return false
    }
  }, [currentDir, listFiles])

  const createFile = useCallback(async () => {
    const name = prompt('File name:')
    if (!name) return
    const content = prompt('Content:') || ''
    await writeFile(name, content)
  }, [writeFile])

  const pickFile = useCallback(async () => {
    if (!('showOpenFilePicker' in window)) {
      // Fallback to input
      return new Promise<{ name: string, content: string } | null>((resolve) => {
        const input = document.createElement('input')
        input.type = 'file'
        input.onchange = async () => {
          const file = input.files?.[0]
          if (!file) return resolve(null)
          const content = await file.text()
          resolve({ name: file.name, content })
        }
        input.click()
      })
    }

    try {
      // @ts-ignore
      const [handle] = await window.showOpenFilePicker()
      const result = await readFile(handle)
      return result
    } catch (e: any) {
      if (e.name !== 'AbortError') setError(e.message)
      return null
    }
  }, [readFile])

  const saveFile = useCallback(async (name: string, content: string) => {
    if (!('showSaveFilePicker' in window)) {
      // Fallback download
      const blob = new Blob([content], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = name
      a.click()
      URL.revokeObjectURL(url)
      return true
    }

    try {
      // @ts-ignore
      const handle = await window.showSaveFilePicker({ suggestedName: name })
      const writable = await handle.createWritable()
      await writable.write(content)
      await writable.close()
      return true
    } catch (e: any) {
      if (e.name !== 'AbortError') setError(e.message)
      return false
    }
  }, [])

  return {
    isSupported,
    currentDir,
    files,
    currentPath,
    error,
    isLoading,
    pickDirectory,
    listFiles,
    readFile,
    writeFile,
    createFile,
    pickFile,
    saveFile
  }
}
