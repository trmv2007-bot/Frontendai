import { useEffect, useRef, useState, useCallback } from 'react'

export type VoiceState = {
  isListening: boolean
  isSpeaking: boolean
  transcript: string
  interimTranscript: string
  isSupported: boolean
  voices: SpeechSynthesisVoice[]
  selectedVoice: SpeechSynthesisVoice | null
  error: string | null
}

export function useVoice() {
  const [state, setState] = useState<VoiceState>({
    isListening: false,
    isSpeaking: false,
    transcript: '',
    interimTranscript: '',
    isSupported: false,
    voices: [],
    selectedVoice: null,
    error: null
  })

  const recognitionRef = useRef<any>(null)
  const synthRef = useRef<SpeechSynthesis | null>(null)

  // Init support check
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    const speechSynthesis = window.speechSynthesis
    const isSupported = !!(SpeechRecognition && speechSynthesis)
    
    setState(s => ({ ...s, isSupported }))
    synthRef.current = speechSynthesis || null

    // Load voices
    const loadVoices = () => {
      const voices = speechSynthesis?.getVoices() || []
      setState(s => ({ 
        ...s, 
        voices,
        selectedVoice: s.selectedVoice || voices.find(v => v.name.includes('Natural') || v.default) || voices[0] || null
      }))
    }

    loadVoices()
    speechSynthesis?.addEventListener('voiceschanged', loadVoices)

    return () => {
      speechSynthesis?.removeEventListener('voiceschanged', loadVoices)
    }
  }, [])

  const startListening = useCallback((onResult?: (text: string) => void) => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      setState(s => ({ ...s, error: 'SpeechRecognition not supported in this browser. Try Chrome.' }))
      return
    }

    if (recognitionRef.current) {
      try { recognitionRef.current.stop() } catch {}
    }

    const rec = new SpeechRecognition()
    rec.continuous = true
    rec.interimResults = true
    rec.lang = 'en-US'

    rec.onstart = () => setState(s => ({ ...s, isListening: true, error: null }))
    rec.onend = () => setState(s => ({ ...s, isListening: false }))
    rec.onerror = (e: any) => setState(s => ({ ...s, error: e.error, isListening: false }))

    rec.onresult = (event: any) => {
      let interim = ''
      let final = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i]
        if (res.isFinal) final += res[0].transcript
        else interim += res[0].transcript
      }
      setState(s => ({ 
        ...s, 
        transcript: final ? s.transcript + final : s.transcript,
        interimTranscript: interim 
      }))
      if (final && onResult) onResult(final)
    }

    recognitionRef.current = rec
    try { rec.start() } catch (e: any) { setState(s => ({ ...s, error: e.message })) }
  }, [])

  const stopListening = useCallback(() => {
    try { recognitionRef.current?.stop() } catch {}
    setState(s => ({ ...s, isListening: false, interimTranscript: '' }))
  }, [])

  const speak = useCallback((text: string, opts?: { rate?: number, pitch?: number, voice?: SpeechSynthesisVoice }) => {
    if (!synthRef.current) return

    // Stop any current speech
    synthRef.current.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.voice = opts?.voice || state.selectedVoice
    utterance.rate = opts?.rate ?? 1
    utterance.pitch = opts?.pitch ?? 1
    utterance.volume = 1

    utterance.onstart = () => setState(s => ({ ...s, isSpeaking: true }))
    utterance.onend = () => setState(s => ({ ...s, isSpeaking: false }))
    utterance.onerror = (e: any) => setState(s => ({ ...s, isSpeaking: false, error: e.error }))

    synthRef.current.speak(utterance)
  }, [state.selectedVoice])

  const stopSpeaking = useCallback(() => {
    synthRef.current?.cancel()
    setState(s => ({ ...s, isSpeaking: false }))
  }, [])

  const setVoice = useCallback((voice: SpeechSynthesisVoice) => {
    setState(s => ({ ...s, selectedVoice: voice }))
  }, [])

  const clearTranscript = useCallback(() => {
    setState(s => ({ ...s, transcript: '', interimTranscript: '' }))
  }, [])

  return {
    ...state,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    setVoice,
    clearTranscript
  }
}
