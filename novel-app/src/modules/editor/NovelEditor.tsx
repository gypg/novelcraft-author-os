import { useEffect, useRef, useCallback } from 'react'
import { useEditor, EditorContent, type Editor } from '@tiptap/react'
import { baseExtensions } from './extensions'
import { updateChapterContent } from '@/core/db/repository'
import { saveChapterVersion } from '@/core/db/version-repository'
import { useEditorStore } from './store'
import { AIBubbleMenuContent } from './ai-inline/AIBubbleMenu'
import { logger } from '@/shared/utils/logger'
import { useAutoSave } from '@/shared/hooks/use-auto-save'

interface NovelEditorProps {
  chapterId: string
  initialContent: string
  providerId?: string | null
  model?: string | null
  onWordCountChange?: (count: number) => void
  onEditorReady?: (editor: Editor) => void
  onEditorDestroy?: () => void
}

export function NovelEditor({
  chapterId,
  initialContent,
  providerId,
  model,
  onWordCountChange,
  onEditorReady,
  onEditorDestroy,
}: NovelEditorProps) {
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const editorRef = useRef<Editor | null>(null)
  const { setDirty, setWordCount, setSaveStatus, saveRequestCounter } = useEditorStore()
  const scrollContainerRef = useRef<HTMLDivElement | null>(null)

  const scrollToCenter = useCallback((editor: Editor) => {
    if (!scrollContainerRef.current) return
    const { from } = editor.state.selection
    try {
      const coords = editor.view.coordsAtPos(from)
      const container = scrollContainerRef.current
      const targetScroll = container.scrollTop + coords.top - container.getBoundingClientRect().top - container.clientHeight / 2
      container.scrollTo({ top: Math.max(0, targetScroll), behavior: 'smooth' })
    } catch {
      // position may be out of range
    }
  }, [])

  const getContent = useCallback(() => {
    if (!editorRef.current || editorRef.current.isDestroyed) return null
    return editorRef.current.getHTML()
  }, [])

  useAutoSave({
    chapterId,
    getContent,
    interval: 30000,
  })

  const editor = useEditor({
    extensions: baseExtensions,
    content: initialContent || '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[60vh] px-8 py-6',
        style: 'color: var(--foreground); caret-color: var(--foreground);',
      },
    },
    onCreate: ({ editor }) => {
      editorRef.current = editor
      onEditorReady?.(editor)
    },
    onDestroy: () => {
      editorRef.current = null
      onEditorDestroy?.()
    },
    onUpdate: ({ editor }) => {
      setDirty(true)

      const text = editor.getText()
      const wc = countWords(text)
      setWordCount(wc)
      onWordCountChange?.(wc)

      scrollToCenter(editor)

      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(() => {
        const html = editor.getHTML()
        logger.debug('editor', `Auto-save: chapter=${chapterId} html_len=${html.length}`)
        setSaveStatus('saving')
        updateChapterContent(chapterId, html)
          .then(() => {
            setDirty(false)
            setSaveStatus('saved')
            logger.debug('editor', `Auto-save OK: chapter=${chapterId}`)
            saveChapterVersion(chapterId, html).catch((err) =>
              logger.error('editor', `Version save FAILED: ${err}`),
            )
          })
          .catch((err) => {
            setSaveStatus('error', String(err))
            logger.error('editor', `Auto-save FAILED: ${err}`)
          })
      }, 2000)
    },
  })

  useEffect(() => {
    if (saveRequestCounter === 0) return
    if (!editorRef.current || editorRef.current.isDestroyed) return

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
      saveTimerRef.current = null
    }

    const html = editorRef.current.getHTML()
    logger.debug('editor', `Manual save: chapter=${chapterId}`)
    setSaveStatus('saving')
    updateChapterContent(chapterId, html)
      .then(() => {
        setDirty(false)
        setSaveStatus('saved')
        logger.debug('editor', `Manual save OK: chapter=${chapterId}`)
        saveChapterVersion(chapterId, html).catch((err) =>
          logger.error('editor', `Version save FAILED: ${err}`),
        )
      })
      .catch((err) => {
        setSaveStatus('error', String(err))
        logger.error('editor', `Manual save FAILED: ${err}`)
      })
  }, [saveRequestCounter, chapterId, setDirty, setSaveStatus])

  useEffect(() => {
    if (editor && !editor.isDestroyed) {
      editor.commands.setContent(initialContent || '')
      const wc = countWords(editor.getText())
      setWordCount(wc)
    }
  }, [chapterId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [])

  if (!editor) return null

  return (
    <div ref={scrollContainerRef} style={{ height: '100%', overflowY: 'auto', backgroundColor: 'var(--app-page-bg)' }}>
      <EditorContent editor={editor} />
      <AIBubbleMenuContent editor={editor} providerId={providerId} model={model} />
    </div>
  )
}

function countWords(text: string): number {
  let count = 0
  let inEnglish = false
  for (const ch of text) {
    if (ch >= '一' && ch <= '鿿') {
      count++
      inEnglish = false
    } else if (/\w/.test(ch)) {
      if (!inEnglish) {
        count++
        inEnglish = true
      }
    } else {
      inEnglish = false
    }
  }
  return count
}
