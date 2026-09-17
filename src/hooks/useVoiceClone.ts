import { useState, useRef, useCallback } from 'react'

type VoiceProfile = {
  id: string
  name: string
  pitch: number
  rate: number
  volume: number
  voiceName: string
  sampleUrl?: string
  created: number
  tags: string[]
}

export function useVoiceClone() {
  const [profiles, setProfiles] = useState<VoiceProfile[]>(() => {
    const saved = localStorage.getItem('frontendai_voice_profiles')
    return saved ? JSON.parse(saved) : []
  })
  const [isRecording, setIsRecording] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [currentPitch, setCurrentPitch] = useState(1)
  const [currentRate, setCurrentRate] = useState(1)
  const [error, setError] = useState<string | null>(null)
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const audioContextRef = useRef<AudioContext | null>(null)

  const saveProfiles = (newProfiles: VoiceProfile[]) => {
    setProfiles(newProfiles)
    localStorage.setItem('frontendai_voice_profiles', JSON.stringify(newProfiles))
  }

  const analyzeAudio = async (blob: Blob): Promise<{ pitch: number, rate: number }> => {
    // Simple pitch analysis via Web Audio API
    // Real voice cloning would need more sophisticated analysis
    return new Promise((resolve) => {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      audioContextRef.current = audioContext
      
      const reader = new FileReader()
      reader.onload = async () => {
        try {
          const arrayBuffer = reader.result as ArrayBuffer
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
          
          // Simple analysis: estimate pitch from zero crossings and energy
          const channelData = audioBuffer.getChannelData(0)
          let zeroCrossings = 0
          for (let i = 1; i < channelData.length; i++) {
            if ((channelData[i-1] >= 0 && channelData[i] < 0) || (channelData[i-1] < 0 && channelData[i] >= 0)) {
              zeroCrossings++
            }
          }
          
          const duration = audioBuffer.duration
          const zcr = zeroCrossings / duration
          
          // Estimate pitch (very rough)
          // Higher ZCR generally means higher pitch
          let pitch = 1
          if (zcr > 2000) pitch = 1.3
          else if (zcr > 1000) pitch = 1.1
          else if (zcr < 500) pitch = 0.8
          else if (zcr < 200) pitch = 0.7

          // Estimate rate from energy and duration
          // This is simplified — real analysis would be more complex
          const rate = duration > 3 ? 0.9 : duration < 1 ? 1.2 : 1

          resolve({ pitch, rate })
        } catch (e) {
          resolve({ pitch: 1, rate: 1 })
        }
      }
      reader.readAsArrayBuffer(blob)
    })
  }

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      mediaRecorderRef.current = recorder
      audioChunksRef.current = []
      setIsRecording(true)
      setError(null)

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }

      recorder.start()
    } catch (e: any) {
      setError(e.message)
    }
  }, [])

  const stopRecording = useCallback(async (profileName?: string): Promise<VoiceProfile | null> => {
    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current
      if (!recorder) {
        resolve(null)
        return
      }

      recorder.onstop = async () => {
        setIsRecording(false)
        setIsAnalyzing(true)
        
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        const url = URL.createObjectURL(blob)
        
        try {
          const analysis = await analyzeAudio(blob)
          setCurrentPitch(analysis.pitch)
          setCurrentRate(analysis.rate)

          const profile: VoiceProfile = {
            id: Math.random().toString(36).slice(2,9),
            name: profileName || `Voice ${profiles.length + 1}`,
            pitch: analysis.pitch,
            rate: analysis.rate,
            volume: 1,
            voiceName: speechSynthesis.getVoices()[0]?.name || 'default',
            sampleUrl: url,
            created: Date.now(),
            tags: ['cloned']
          }

          const newProfiles = [...profiles, profile]
          saveProfiles(newProfiles)
          setIsAnalyzing(false)
          resolve(profile)
        } catch (e: any) {
          setError(e.message)
          setIsAnalyzing(false)
          resolve(null)
        }

        // Stop tracks
        recorder.stream.getTracks().forEach(t => t.stop())
      }

      recorder.stop()
    })
  }, [profiles])

  const speakWithProfile = useCallback((text: string, profile: VoiceProfile) => {
    if (!('speechSynthesis' in window)) {
      setError('SpeechSynthesis not supported')
      return
    }

    speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    
    const voices = speechSynthesis.getVoices()
    const voice = voices.find(v => v.name === profile.voiceName) || voices[0]
    if (voice) utterance.voice = voice
    
    utterance.pitch = profile.pitch
    utterance.rate = profile.rate
    utterance.volume = profile.volume

    speechSynthesis.speak(utterance)
  }, [])

  const speakWithSettings = useCallback((text: string, pitch = currentPitch, rate = currentRate, voiceName?: string) => {
    if (!('speechSynthesis' in window)) return

    speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    
    const voices = speechSynthesis.getVoices()
    const voice = voiceName ? voices.find(v => v.name === voiceName) : voices[0]
    if (voice) utterance.voice = voice
    
    utterance.pitch = pitch
    utterance.rate = rate

    speechSynthesis.speak(utterance)
  }, [currentPitch, currentRate])

  const deleteProfile = useCallback((id: string) => {
    const newProfiles = profiles.filter(p => p.id !== id)
    saveProfiles(newProfiles)
  }, [profiles])

  const cloneFromSample = useCallback(async (file: File, name?: string) => {
    setIsAnalyzing(true)
    try {
      const analysis = await analyzeAudio(file)
      const url = URL.createObjectURL(file)

      const profile: VoiceProfile = {
        id: Math.random().toString(36).slice(2,9),
        name: name || file.name.replace(/\.[^/.]+$/, ''),
        pitch: analysis.pitch,
        rate: analysis.rate,
        volume: 1,
        voiceName: speechSynthesis.getVoices()[0]?.name || 'default',
        sampleUrl: url,
        created: Date.now(),
        tags: ['cloned', 'file']
      }

      const newProfiles = [...profiles, profile]
      saveProfiles(newProfiles)
      setCurrentPitch(analysis.pitch)
      setCurrentRate(analysis.rate)
      setIsAnalyzing(false)
      return profile
    } catch (e: any) {
      setError(e.message)
      setIsAnalyzing(false)
      return null
    }
  }, [profiles])

  return {
    profiles,
    isRecording,
    isAnalyzing,
    currentPitch,
    currentRate,
    error,
    startRecording,
    stopRecording,
    speakWithProfile,
    speakWithSettings,
    deleteProfile,
    cloneFromSample,
    setCurrentPitch,
    setCurrentRate
  }
}
