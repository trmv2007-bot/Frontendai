import { useState, useRef, useCallback, useEffect } from 'react'

type V2VStatus = 'idle' | 'listening' | 'thinking' | 'speaking' | 'error'

type V2VMessage = {
  id: string
  role: 'user' | 'assistant'
  text: string
  timestamp: number
  isFinal?: boolean
}

export function useVoiceToVoice(onUserMessage?: (text: string) => Promise<string>) {
  const [status, setStatus] = useState<V2VStatus>('idle')
  const [messages, setMessages] = useState<V2VMessage[]>([])
  const [isSupported, setIsSupported] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isContinuous, setIsContinuous] = useState(false)

  const recognitionRef = useRef<any>(null)
  const synthRef = useRef<SpeechSynthesis | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const vadRef = useRef<number | null>(null)
  const isSpeakingRef = useRef(false)

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    setIsSupported(!!(SpeechRecognition && window.speechSynthesis))
    synthRef.current = window.speechSynthesis || null
  }, [])

  // VAD - Voice Activity Detection via Web Audio API
  const startVAD = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      audioContextRef.current = audioContext
      
      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 512
      source.connect(analyser)
      analyserRef.current = analyser

      const dataArray = new Uint8Array(analyser.frequencyBinCount)

      const checkAudio = () => {
        analyser.getByteFrequencyData(dataArray)
        const average = dataArray.reduce((a,b) => a+b, 0) / dataArray.length
        
        // Simple VAD: if average > threshold and not speaking, consider it speech
        if (average > 20 && !isSpeakingRef.current && status === 'listening') {
          // Voice detected
        }

        vadRef.current = requestAnimationFrame(checkAudio) as unknown as number
      }

      checkAudio()

      return () => {
        stream.getTracks().forEach(t => t.stop())
        if (vadRef.current) cancelAnimationFrame(vadRef.current)
        audioContext.close()
      }
    } catch (e: any) {
      setError(e.message)
    }
  }, [status])

  const speak = useCallback((text: string): Promise<void> => {
    return new Promise((resolve) => {
      if (!synthRef.current) {
        resolve()
        return
      }

      synthRef.current.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      
      const voices = synthRef.current.getVoices()
      const voice = voices.find(v => v.name.includes('Natural') || v.default) || voices[0]
      if (voice) utterance.voice = voice

      utterance.rate = 1
      utterance.pitch = 1

      utterance.onstart = () => {
        isSpeakingRef.current = true
        setStatus('speaking')
      }

      utterance.onend = () => {
        isSpeakingRef.current = false
        setStatus(isContinuous ? 'listening' : 'idle')
        resolve()
      }

      utterance.onerror = () => {
        isSpeakingRef.current = false
        setStatus(isContinuous ? 'listening' : 'idle')
        resolve()
      }

      synthRef.current.speak(utterance)
    })
  }, [isContinuous])

  const startListening = useCallback((continuous = false) => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      setError('SpeechRecognition not supported. Try Chrome.')
      return
    }

    if (recognitionRef.current) {
      try { recognitionRef.current.stop() } catch {}
    }

    const rec = new SpeechRecognition()
    rec.continuous = continuous
    rec.interimResults = true
    rec.lang = 'en-US'

    rec.onstart = () => {
      setStatus('listening')
      setError(null)
      if (continuous) startVAD()
    }

    rec.onend = () => {
      if (continuous && isContinuous) {
        // Restart if continuous mode
        try { rec.start() } catch {}
      } else {
        setStatus('idle')
      }
    }

    rec.onerror = (e: any) => {
      if (e.error !== 'no-speech') setError(e.error)
      if (continuous && isContinuous) {
        setTimeout(() => {
          try { rec.start() } catch {}
        }, 1000)
      } else {
        setStatus('idle')
      }
    }

    rec.onresult = async (event: any) => {
      let interim = ''
      let final = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i]
        if (res.isFinal) final += res[0].transcript
        else interim += res[0].transcript
      }

      if (interim) {
        // Show interim
        setMessages(prev => {
          const last = prev[prev.length-1]
          if (last && last.role === 'user' && !last.isFinal) {
            return [...prev.slice(0,-1), { ...last, text: interim }]
          }
          return [...prev, { id: Math.random().toString(36).slice(2,9), role: 'user', text: interim, timestamp: Date.now(), isFinal: false }]
        })
      }

      if (final) {
        const userMsg: V2VMessage = {
          id: Math.random().toString(36).slice(2,9),
          role: 'user',
          text: final,
          timestamp: Date.now(),
          isFinal: true
        }

        setMessages(prev => {
          // Replace interim with final
          const filtered = prev.filter(m => !(m.role === 'user' && !m.isFinal))
          return [...filtered, userMsg]
        })

        if (onUserMessage) {
          setStatus('thinking')
          try {
            const response = await onUserMessage(final)
            
            const assistantMsg: V2VMessage = {
              id: Math.random().toString(36).slice(2,9),
              role: 'assistant',
              text: response,
              timestamp: Date.now(),
              isFinal: true
            }

            setMessages(prev => [...prev, assistantMsg])
            await speak(response)
          } catch (e: any) {
            setError(e.message)
            setStatus(continuous ? 'listening' : 'idle')
          }
        }
      }
    }

    recognitionRef.current = rec
    try {
      rec.start()
      setIsContinuous(continuous)
    } catch (e: any) {
      setError(e.message)
    }
  }, [onUserMessage, isContinuous, speak, startVAD])

  const stop = useCallback(() => {
    try { recognitionRef.current?.stop() } catch {}
    try { synthRef.current?.cancel() } catch {}
    if (vadRef.current) cancelAnimationFrame(vadRef.current)
    try { audioContextRef.current?.close() } catch {}
    setStatus('idle')
    setIsContinuous(false)
    isSpeakingRef.current = false
  }, [])

  const clear = useCallback(() => {
    setMessages([])
  }, [])

  return {
    status,
    messages,
    isSupported,
    error,
    isContinuous,
    startListening,
    stop,
    clear,
    speak,
    analyser: analyserRef.current
  }
}
