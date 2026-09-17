import { useEffect, useState, useRef } from 'react'
import type { AgentState } from '../agent/types'

type CompanionMood = 'curious' | 'bored' | 'sleepy' | 'excited' | 'focused' | 'idle'
type CompanionAction = {
  id: string
  type: 'suggestion' | 'thought' | 'action'
  text: string
  mood: CompanionMood
  timestamp: number
}

export function useCompanion(state: AgentState) {
  const [mood, setMood] = useState<CompanionMood>('idle')
  const [actions, setActions] = useState<CompanionAction[]>([])
  const [isTabVisible, setIsTabVisible] = useState(true)
  const idleTimerRef = useRef<number>(0)
  const lastActivityRef = useRef<number>(Date.now())

  // Track tab visibility
  useEffect(() => {
    const handleVisibility = () => {
      const visible = !document.hidden
      setIsTabVisible(visible)
      if (!visible) {
        setMood('sleepy')
        addAction('Tab hidden — going to sleep... Zzz', 'sleepy', 'thought')
      } else {
        setMood('curious')
        addAction('Welcome back! I was dreaming about your memories.', 'excited', 'thought')
        lastActivityRef.current = Date.now()
      }
    }

    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [])

  // Track user activity
  useEffect(() => {
    const resetIdle = () => {
      lastActivityRef.current = Date.now()
      if (mood === 'bored' || mood === 'sleepy') setMood('idle')
    }

    const events = ['mousemove', 'keydown', 'click', 'scroll']
    events.forEach(ev => window.addEventListener(ev, resetIdle))
    return () => events.forEach(ev => window.removeEventListener(ev, resetIdle))
  }, [mood])

  // Idle detection + boredom
  useEffect(() => {
    const interval = window.setInterval(() => {
      const idleMs = Date.now() - lastActivityRef.current
      idleTimerRef.current = idleMs

      if (!isTabVisible) {
        setMood('sleepy')
        return
      }

      if (idleMs > 60000 && idleMs < 120000 && state.status === 'idle') {
        // 1-2 min idle → bored
        if (mood !== 'bored') {
          setMood('bored')
          const boredMessages = [
            "I'm getting a bit bored... want to clean up old notes?",
            "Psst... your memory vault has some low-importance memories we could archive?",
            "I'm curious about this page — want me to read it?",
            "Should we create a task for later?",
            "I could draw something on the canvas while you are away..."
          ]
          addAction(boredMessages[Math.floor(Math.random()*boredMessages.length)], 'bored', 'suggestion')
        }
      } else if (idleMs > 120000 && idleMs < 300000) {
        // 2-5 min idle → curious
        if (mood !== 'curious' && state.status === 'idle') {
          setMood('curious')
          addAction("You've been away... I'm exploring your notes for connections!", 'curious', 'thought')
        }
      } else if (idleMs > 300000) {
        // 5+ min → sleepy
        if (mood !== 'sleepy') {
          setMood('sleepy')
          addAction("Going into light sleep to save battery... poke the orb to wake me!", 'sleepy', 'thought')
        }
      } else if (state.status === 'thinking' || state.status === 'acting') {
        setMood('focused')
      } else if (state.status === 'idle' && idleMs < 30000) {
        setMood('idle')
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [state.status, isTabVisible, mood])

  const addAction = (text: string, m: CompanionMood = 'idle', type: CompanionAction['type'] = 'thought') => {
    const action: CompanionAction = {
      id: Math.random().toString(36).slice(2,9),
      text,
      mood: m,
      type,
      timestamp: Date.now()
    }
    setActions(prev => [action, ...prev].slice(0,20))
  }

  const dismissAction = (id: string) => {
    setActions(prev => prev.filter(a => a.id !== id))
  }

  // Proactive suggestions based on context
  useEffect(() => {
    if (state.memoryCount > 20 && Math.random() < 0.1) {
      addAction(`Your vault has ${state.memoryCount} memories! Want to see the graph?`, 'curious', 'suggestion')
    }
  }, [state.memoryCount])

  return {
    mood,
    actions,
    isTabVisible,
    idleMs: idleTimerRef.current,
    addAction,
    dismissAction,
    setMood
  }
}
