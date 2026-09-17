import { useState, useRef, useCallback } from 'react'

type WhisperStatus = 'idle' | 'loading' | 'ready' | 'transcribing' | 'error'

export function useWhisper() {
  const [status, setStatus] = useState<WhisperStatus>('idle')
  const [progress, setProgress] = useState('')
  const [transcript, setTranscript] = useState('')
  const pipelineRef = useRef<any>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  const load = useCallback(async () => {
    if (pipelineRef.current) return pipelineRef.current
    if (status === 'loading') return null

    setStatus('loading')
    setProgress('Downloading Whisper tiny (40MB)...')

    try {
      const { pipeline, env } = await import('@huggingface/transformers')
      // @ts-ignore
      env.allowLocalModels = false
      // @ts-ignore
      env.useBrowserCache = true

      const pipe = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny.en', {
        // @ts-ignore
        quantized: true,
        progress_callback: (p: any) => {
          if (p.status === 'progress') {
            setProgress(`${p.file} ${Math.round(p.progress||0)}%`)
          }
        }
      })

      pipelineRef.current = pipe
      setStatus('ready')
      setProgress('Whisper ready — 100% local')
      return pipe
    } catch (e: any) {
      console.error('Whisper load failed', e)
      setStatus('error')
      setProgress(`Failed: ${e.message}`)
      return null
    }
  }, [status])

  const transcribeBlob = useCallback(async (blob: Blob) => {
    const pipe = pipelineRef.current || await load()
    if (!pipe) return null

    setStatus('transcribing')
    setProgress('Transcribing locally...')

    try {
      // Convert blob to array buffer and then to audio data
      // For simplicity, use URL and let pipeline handle it
      const url = URL.createObjectURL(blob)
      const result = await pipe(url, {
        chunk_length_s: 30,
        stride_length_s: 5,
        language: 'english',
        task: 'transcribe'
      })
      URL.revokeObjectURL(url)
      
      const text = result.text || ''
      setTranscript(text)
      setStatus('ready')
      setProgress('Done')
      return text
    } catch (e: any) {
      setStatus('error')
      setProgress(`Transcribe failed: ${e.message}`)
      return null
    }
  }, [load])

  const startRecording = useCallback(async (onResult?: (text: string) => void) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      mediaRecorderRef.current = recorder
      audioChunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }

      recorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        const text = await transcribeBlob(blob)
        if (text && onResult) onResult(text)
        stream.getTracks().forEach(t => t.stop())
      }

      recorder.start()
      setStatus('transcribing')
      setProgress('Recording... speak now')
    } catch (e: any) {
      setStatus('error')
      setProgress(`Mic failed: ${e.message}`)
    }
  }, [transcribeBlob])

  const stopRecording = useCallback(() => {
    try {
      mediaRecorderRef.current?.stop()
    } catch {}
  }, [])

  const transcribeFile = useCallback(async (file: File) => {
    return await transcribeBlob(file)
  }, [transcribeBlob])

  return {
    status,
    progress,
    transcript,
    load,
    startRecording,
    stopRecording,
    transcribeFile,
    transcribeBlob,
    isRecording: status === 'transcribing' && !!mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording'
  }
}
