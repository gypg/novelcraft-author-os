import { useEffect } from 'react'
import { useToast } from '@/shared/components/Toast'
import { eventBus } from '@/core/events'
import { parseToStructuredError, formatErrorForUser } from '@/shared/components/StructuredError'
import { logger } from '@/shared/utils/logger'

export function usePipelineToast() {
  const { addToast } = useToast()

  useEffect(() => {
    const unsubs = [
      eventBus.on('pipeline:audit:complete', (data) => {
        const score = data?.score ?? 0
        if (score >= 80) {
          addToast(`审计通过 (${score} 分)`, 'success')
        } else if (score >= 60) {
          addToast(`审计完成 (${score} 分)，有警告项`, 'warning')
        } else {
          addToast(`审计评分较低 (${score} 分)，建议修订`, 'error', 6000)
        }
      }),

      eventBus.on('pipeline:quality-gate:exceeded', (data) => {
        addToast(
          `质量门控超过最大重试次数 (${data?.maxRetries ?? 3})，已暂停`,
          'error',
          8000,
        )
      }),

      eventBus.on('ai:resilience:degraded', (data) => {
        const structured = parseToStructuredError(data?.error)
        const userMsg = formatErrorForUser(structured)
        const isAuthError = structured.code === 'AUTH_ERROR' || structured.code === 'INVALID_API_KEY' || structured.code === 'MISSING_CREDENTIALS'
        addToast(
          userMsg,
          'error',
          8000,
          isAuthError
            ? {
                label: '去设置',
                onClick: () => { window.location.hash = '/settings' },
              }
            : structured.retryable
              ? {
                  label: '了解详情',
                  onClick: () => { logger.warn('AI', `Error detail: ${JSON.stringify(structured)}`) },
                }
              : undefined,
        )
      }),

      eventBus.on('ai:stream:error', (data) => {
        const structured = parseToStructuredError(data?.error)
        addToast(formatErrorForUser(structured), 'error', 6000)
      }),

      eventBus.on('export:error', (data) => {
        addToast(`导出失败 (${data?.format}): ${data?.error ?? '未知错误'}`, 'error')
      }),

      eventBus.on('pipeline:plan:complete', (data) => {
        addToast(`规划完成，共 ${data?.goalsCount ?? 0} 个目标`, 'info')
      }),

      eventBus.on('auto-pilot:chapter-complete', (data) => {
        addToast(`章节完成 (${data?.score ?? 0} 分)`, 'success')
      }),
    ]

    return () => unsubs.forEach((fn) => fn())
  }, [addToast])
}
