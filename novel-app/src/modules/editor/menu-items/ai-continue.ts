import type { Editor } from '@tiptap/react'
import { buildWritingContext, callLlm } from '@/core/ai-engine'
import type { ChatMessage } from '@/core/ai-engine'
import { runObserve } from '@/core/pipeline/observe'
import { listChapters } from '@/core/db/repository'
import { logger } from '@/shared/utils/logger'
import { useContextDiagnosticsStore } from '@/modules/ai-collab/context-diagnostics-store'
import { buildRetrievalDiagnostics } from '@/modules/ai-collab/build-retrieval-diagnostics'

export interface AiContinueOptions {
  editor: Editor
  bookId: string
  chapterId: string
  providerId: string
  model?: string
  outlineTitle?: string | null
  outlineDescription?: string | null
  onStageChange?: (stage: string | null) => void
  onStart?: () => void
  onComplete?: () => void
  onError?: (error: string) => void
}

let abortController: AbortController | null = null

export function isGenerating(): boolean {
  return abortController !== null
}

export function stopGeneration() {
  abortController?.abort()
  abortController = null
}

export async function handleAiContinue(options: AiContinueOptions): Promise<void> {
  const { editor, bookId, chapterId, providerId, model, outlineTitle, outlineDescription, onStageChange, onStart, onComplete, onError } = options

  if (isGenerating()) return

  abortController = new AbortController()
  onStart?.()

  try {
    // 1. Get current content from editor
    const currentContent = editor.getHTML()
    logger.info('ai-continue', `Editor content length: ${currentContent.length}`)

    // 2. Build writing context
    onStageChange?.('构建上下文...')
    logger.info('ai-continue', 'Building writing context...')
    const { messages, context } = await buildWritingContext({
      bookId,
      chapterId,
      currentContent,
      outlineTitle,
      outlineDescription,
    })

    // 2a. Publish diagnostics to store for UI panels
    try {
      const retrievalDiagnostics = buildRetrievalDiagnostics(context.retrievedKnowledge)
      useContextDiagnosticsStore.getState().setDiagnostics(
        context.budgetReport,
        retrievalDiagnostics,
        bookId,
        chapterId
      )
      logger.info('ai-continue', `Published context diagnostics: ${retrievalDiagnostics.length} items`)
    } catch (diagErr) {
      logger.warn('ai-continue', `Failed to publish diagnostics (non-fatal): ${diagErr}`)
    }

    // 3. Add generation instruction
    const finalMessages: ChatMessage[] = [
      ...messages,
      { role: 'user', content: '请直接续写，不要重复已有内容，不要加任何标题或注释。' },
    ]

    // 4. Stream LLM response into editor
    onStageChange?.('AI 思考中...')
    logger.info('ai-continue', `Calling LLM with ${finalMessages.length} messages`)
    let firstDelta = true

    await callLlm({
      providerId,
      model,
      messages: finalMessages,
      maxTokens: 2000,
      temperature: 0.8,
      onDelta: (delta) => {
        if (abortController?.signal.aborted) return

        if (firstDelta) {
          onStageChange?.('正在写作...')
          firstDelta = false
          logger.info('ai-continue', `First delta received: "${delta.slice(0, 30)}..."`)
        }

        // Insert content at the end of the document
        editor
          .chain()
          .focus()
          .command(({ tr }) => {
            // Insert at the very end
            const pos = tr.doc.content.size
            tr.insertText(delta, pos)
            return true
          })
          .run()
      },
      onError: (err) => {
        onError?.(err)
      },
    })

    // 5. Observe: extract facts from written content for timeline/knowledge graph
    if (!abortController?.signal.aborted) {
      try {
        onStageChange?.('提取事实中...')
        const chapters = await listChapters(bookId)
        const chapterIdx = chapters.findIndex((c) => c.id === chapterId)
        const chapterNumber = chapterIdx >= 0 ? chapterIdx + 1 : 1
        const writtenContent = editor.getHTML()

        await runObserve({
          bookId,
          chapterId,
          chapterContent: writtenContent,
          chapterNumber,
        })
        logger.info('ai-continue', `Observe completed for chapter ${chapterNumber}`)
      } catch (observeErr) {
        // Don't fail the write just because observe failed
        logger.warn('ai-continue', `Observe step failed (non-fatal): ${observeErr}`)
      }
    }

    onStageChange?.(null)
    logger.info('ai-continue', 'Generation complete')
    onComplete?.()
  } catch (err) {
    logger.error('ai-continue', `Error: ${String(err)}`)
    if (abortController?.signal.aborted) {
      onStageChange?.('已停止')
      setTimeout(() => onStageChange?.(null), 1500)
    } else {
      onError?.(String(err))
      onStageChange?.(null)
    }
  } finally {
    abortController = null
  }
}
