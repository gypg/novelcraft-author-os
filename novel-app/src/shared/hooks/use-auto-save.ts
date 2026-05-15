import { useEffect, useRef, useCallback } from 'react'
import { useEditorStore } from '@/modules/editor/store'
import { updateChapterContent } from '@/core/db/repository'
import { logger } from '@/shared/utils/logger'

interface AutoSaveOptions {
  chapterId: string | null
  getContent: () => string | null
  interval?: number
}

export function useAutoSave({ chapterId, getContent, interval = 30000 }: AutoSaveOptions) {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastSavedRef = useRef<string>('')
  const { isDirty, setDirty, setSaveStatus } = useEditorStore()

  const forceSave = useCallback(async () => {
    if (!chapterId) return
    const content = getContent()
    if (content === null) return
    if (!isDirty && content === lastSavedRef.current) return

    setSaveStatus('saving')
    try {
      await updateChapterContent(chapterId, content)
      lastSavedRef.current = content
      setDirty(false)
      setSaveStatus('saved')
      logger.debug('auto-save', `Periodic save OK: chapter=${chapterId}`)
    } catch (err) {
      setSaveStatus('error', String(err))
      logger.error('auto-save', `Periodic save FAILED: ${err}`)
    }
  }, [chapterId, getContent, isDirty, setDirty, setSaveStatus])

  useEffect(() => {
    if (!chapterId) return

    timerRef.current = setInterval(() => {
      forceSave()
    }, interval)

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [chapterId, interval, forceSave])

  useEffect(() => {
    if (!chapterId) return

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isDirty) return
      const content = getContent()
      if (content === null) return

      try {
        const tauriInternals = (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__
        if (tauriInternals) {
          updateChapterContent(chapterId, content).catch(() => {})
        }
      } catch {
        // best-effort
      }

      e.preventDefault()
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [chapterId, isDirty, getContent])

  return { forceSave }
}
