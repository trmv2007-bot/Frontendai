import { useState, useRef, useCallback } from 'react'

type PyodideStatus = 'idle' | 'loading' | 'ready' | 'running' | 'error'

export function usePyodide() {
  const [status, setStatus] = useState<PyodideStatus>('idle')
  const [progress, setProgress] = useState('')
  const [output, setOutput] = useState<string[]>([])
  const pyodideRef = useRef<any>(null)

  const load = useCallback(async () => {
    if (pyodideRef.current) return pyodideRef.current
    if (status === 'loading') return null

    setStatus('loading')
    setProgress('Downloading Pyodide (10MB wasm + stdlib)...')

    try {
      // @ts-ignore
      const { loadPyodide } = await import('pyodide')
      
      setProgress('Loading Python runtime...')
      const pyodide = await loadPyodide({
        indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.26.2/full/'
      })

      setProgress('Setting up environment...')
      // Setup stdout capture
      pyodide.setStdout({
        batched: (text: string) => {
          setOutput(prev => [...prev, text])
        }
      })
      pyodide.setStderr({
        batched: (text: string) => {
          setOutput(prev => [...prev, `STDERR: ${text}`])
        }
      })

      // Pre-import common packages
      await pyodide.loadPackage(['micropip'])
      
      pyodideRef.current = pyodide
      setStatus('ready')
      setProgress('Python 3.12 ready — 100% local, no server')
      setOutput(prev => [...prev, 'Python 3.12 (Pyodide) ready. Try: import math; print(math.pi)'])
      return pyodide
    } catch (e: any) {
      console.error('Pyodide load failed', e)
      setStatus('error')
      setProgress(`Failed: ${e.message}. Try reloading.`)
      return null
    }
  }, [status])

  const runPython = useCallback(async (code: string) => {
    const pyodide = pyodideRef.current || await load()
    if (!pyodide) return null

    setStatus('running')
    setOutput(prev => [...prev, `>>> ${code.slice(0,200)}`])

    try {
      // Capture output
      let result = await pyodide.runPythonAsync(code)
      
      // If result is not undefined, show it
      if (result !== undefined) {
        const str = typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result)
        setOutput(prev => [...prev, str])
      }
      
      setStatus('ready')
      return result
    } catch (e: any) {
      const errMsg = e.message || String(e)
      setOutput(prev => [...prev, `Error: ${errMsg}`])
      setStatus('ready')
      return null
    }
  }, [load])

  const installPackage = useCallback(async (pkg: string) => {
    const pyodide = pyodideRef.current || await load()
    if (!pyodide) return

    setStatus('running')
    setProgress(`Installing ${pkg} via micropip...`)
    setOutput(prev => [...prev, `Installing ${pkg}...`])

    try {
      await pyodide.runPythonAsync(`
import micropip
await micropip.install("${pkg}")
print("Installed ${pkg}")
      `)
      setStatus('ready')
      setProgress(`Installed ${pkg}`)
    } catch (e: any) {
      setOutput(prev => [...prev, `Install failed: ${e.message}`])
      setStatus('ready')
    }
  }, [load])

  const clearOutput = useCallback(() => setOutput([]), [])

  return {
    status,
    progress,
    output,
    load,
    runPython,
    installPackage,
    clearOutput,
    isReady: status === 'ready',
    isLoading: status === 'loading' || status === 'running'
  }
}
