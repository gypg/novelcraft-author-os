import { useState, useCallback, useEffect, useRef } from 'react'
import type { Editor } from '@tiptap/react'
import { AI_OPERATIONS, type AiOperation } from './operations'
import { generateAiText } from './execute-operation'
import { DiffReviewOverlay } from './DiffReviewOverlay'

interface AIBubbleMenuContentProps {
  editor: Editor
  providerId?: string | null
  model?: string | null
}

type ReviewState = {
  originalText: string
  newText: string
  operationLabel: string
  from: number
  to: number
} | null

export function AIBubbleMenuContent({ editor, providerId, model }: AIBubbleMenuContentProps) {
  const [operating, setOperating] = useState(false)
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number } | null>(null)
  const [reviewState, setReviewState] = useState<ReviewState>(null)
  const [streamPreview, setStreamPreview] = useState('')
  const menuRef = useRef<HTMLDivElement>(null)
  const operatingRef = useRef(false)

  const setOperatingTracked = useCallback((val: boolean) => {
    operatingRef.current = val
    setOperating(val)
    if (val) setMenuPosition(null)
  }, [])

  useEffect(() => {
    if (!providerId) return

    const handleSelectionChange = () => {
      if (reviewState) return

      const selection = window.getSelection()
      if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
        setMenuPosition(null)
        return
      }

      const range = selection.getRangeAt(0)
      const editorEl = editor.view.dom
      if (!editorEl.contains(range.commonAncestorContainer)) {
        setMenuPosition(null)
        return
      }

      if (operatingRef.current) {
        setMenuPosition(null)
        return
      }

      const { from, to } = editor.state.selection
      if (from === to) {
        setMenuPosition(null)
        return
      }

      const rect = range.getBoundingClientRect()
      setMenuPosition({
        x: rect.left + rect.width / 2,
        y: rect.top - 8,
      })
    }

    document.addEventListener('selectionchange', handleSelectionChange)
    return () => document.removeEventListener('selectionchange', handleSelectionChange)
  }, [editor, providerId, reviewState])

  const handleOperation = useCallback(
    async (operation: AiOperation) => {
      if (!providerId || operating) return

      const { from, to } = editor.state.selection
      if (from === to) return

      const selectedText = editor.state.doc.textBetween(from, to, '\n')
      if (!selectedText.trim()) return

      setMenuPosition(null)
      setOperatingTracked(true)
      setStreamPreview('')

      try {
        const newText = await generateAiText({
          providerId,
          model: model ?? undefined,
          prompt: operation.prompt,
          selectedText,
          onDelta: (delta) => {
            setStreamPreview((prev) => prev + delta)
          },
        })

        setReviewState({
          originalText: selectedText,
          newText,
          operationLabel: operation.label,
          from,
          to,
        })
      } catch {
        // error already logged
      } finally {
        setOperatingTracked(false)
        setStreamPreview('')
      }
    },
    [editor, providerId, model, operating, setOperatingTracked],
  )

  const handleAccept = useCallback(() => {
    if (!reviewState) return

    const { from, to, newText } = reviewState
    editor
      .chain()
      .focus()
      .deleteRange({ from, to })
      .command(({ tr }) => {
        tr.insertText(newText, from)
        return true
      })
      .run()

    setReviewState(null)
  }, [editor, reviewState])

  const handleReject = useCallback(() => {
    setReviewState(null)
  }, [])

  if (!providerId) return null

  if (reviewState) {
    return (
      <DiffReviewOverlay
        originalText={reviewState.originalText}
        newText={reviewState.newText}
        operationLabel={reviewState.operationLabel}
        onAccept={handleAccept}
        onReject={handleReject}
      />
    )
  }

  if (operating && streamPreview) {
    return (
      <div
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          zIndex: 100,
          maxWidth: '360px',
          maxHeight: '200px',
          overflowY: 'auto',
          padding: '12px 16px',
          background: 'var(--app-surface)',
          border: '1px solid var(--app-border)',
          borderRadius: 'var(--app-radius-lg)',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
          fontSize: '12px',
          lineHeight: 1.6,
          color: 'var(--app-text-primary)',
          fontFamily: "'Noto Serif SC', 'Source Han Serif SC', serif",
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            marginBottom: '8px',
            fontSize: '11px',
            fontWeight: 700,
            color: 'var(--color-brand)',
          }}
        >
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: 'var(--color-brand)',
              animation: 'pulse 1.5s ease-in-out infinite',
            }}
          />
          AI 生成中...
        </div>
        {streamPreview}
      </div>
    )
  }

  if (!menuPosition) return null

  return (
    <div
      ref={menuRef}
      className="ai-bubble-menu"
      style={{
        position: 'fixed',
        left: menuPosition.x,
        top: menuPosition.y,
        transform: 'translate(-50%, -100%)',
        zIndex: 100,
      }}
    >
      {Object.values(AI_OPERATIONS).map((op) => (
        <button
          key={op.name}
          onClick={() => handleOperation(op)}
          disabled={operating}
        >
          {operating ? '...' : op.label}
        </button>
      ))}
    </div>
  )
}
