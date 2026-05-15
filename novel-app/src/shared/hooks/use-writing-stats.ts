import { useState, useEffect, useCallback, useRef } from 'react'
import { useEditorStore } from '@/modules/editor/store'

interface WritingStats {
  todayWords: number
  sessionDuration: number
  isSessionActive: boolean
}

export function loadTodayWords(): number {
  const stored = localStorage.getItem('novelcraft-writing-stats')
  if (!stored) return 0
  try {
    const parsed = JSON.parse(stored) as { date: string; todayWords: number }
    const today = new Date().toISOString().slice(0, 10)
    return parsed.date === today ? parsed.todayWords : 0
  } catch {
    return 0
  }
}

export function useWritingStats(): WritingStats {
  const [todayWords, setTodayWords] = useState(() => loadTodayWords())
  const [sessionDuration, setSessionDuration] = useState(0)
  const [isSessionActive, setIsSessionActive] = useState(false)
  const sessionStartRef = useRef<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const wordCountAtSessionStart = useRef(0)
  const { wordCount, currentChapterId } = useEditorStore()

  useEffect(() => {
    if (currentChapterId) {
      wordCountAtSessionStart.current = wordCount
      if (!sessionStartRef.current) {
        sessionStartRef.current = Date.now()
        setIsSessionActive(true)
      }
    }
  }, [currentChapterId, wordCount])

  useEffect(() => {
    if (isSessionActive && sessionStartRef.current) {
      timerRef.current = setInterval(() => {
        setSessionDuration(Math.floor((Date.now() - sessionStartRef.current!) / 60000))
      }, 30000)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isSessionActive])

  const saveTodayWords = useCallback((words: number) => {
    const today = new Date().toISOString().slice(0, 10)
    localStorage.setItem('novelcraft-writing-stats', JSON.stringify({ date: today, todayWords: words }))
  }, [])

  useEffect(() => {
    if (!currentChapterId) return
    const diff = wordCount - wordCountAtSessionStart.current
    if (diff > 0) {
      setTodayWords((prev) => {
        const next = prev + diff
        saveTodayWords(next)
        return next
      })
      wordCountAtSessionStart.current = wordCount
    }
  }, [wordCount, currentChapterId, saveTodayWords])

  return { todayWords, sessionDuration, isSessionActive }
}
