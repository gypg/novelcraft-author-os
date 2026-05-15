import { useEffect } from 'react'
import { useToast } from '@/shared/components/Toast'
import { logger } from '@/shared/utils/logger'

export function useGlobalErrorHandler() {
  const { addToast } = useToast()

  useEffect(() => {
    const handleUnhandledRejection = (e: PromiseRejectionEvent) => {
      e.preventDefault()
      const reason = e.reason
      const message = reason instanceof Error
        ? reason.message
        : typeof reason === 'string'
          ? reason
          : String(reason)

      logger.error('global', `Unhandled rejection: ${message}`)

      if (isIgnorable(message)) return

      addToast(`发生错误: ${message.slice(0, 80)}`, 'error', 6000)
    }

    const handleError = (e: ErrorEvent) => {
      const message = e.message || '未知错误'
      logger.error('global', `Uncaught error: ${message} at ${e.filename}:${e.lineno}`)

      if (isIgnorable(message)) return

      addToast(`发生错误: ${message.slice(0, 80)}`, 'error', 6000)
    }

    window.addEventListener('unhandledrejection', handleUnhandledRejection)
    window.addEventListener('error', handleError)

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
      window.removeEventListener('error', handleError)
    }
  }, [addToast])
}

function isIgnorable(message: string): boolean {
  const ignorablePatterns = [
    'ResizeObserver loop',
    'Non-Error promise rejection',
    'NetworkError',
    'Failed to fetch',
    'Load failed',
    'cancel',
    'aborted',
    'AbortError',
  ]
  return ignorablePatterns.some((p) => message.includes(p))
}
