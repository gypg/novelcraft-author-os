import { useState, useEffect, useCallback, useRef } from 'react'
import type { Editor } from '@tiptap/react'
import { handleAiContinue, isGenerating, stopGeneration } from './menu-items/ai-continue'
import { useOutlineStore } from './outline-store'
import { AI_OPERATIONS } from './ai-inline/operations'
import { generateAiText } from './ai-inline/execute-operation'
import { DiffReviewOverlay } from './ai-inline/DiffReviewOverlay'
import { logger } from '@/shared/utils/logger'

interface MenuState {
  visible: boolean
  x: number
  y: number
}

interface EditorContextMenuProps {
  editor: Editor
  bookId: string
  chapterId: string
  providerId: string | null
  model?: string
}

type ReviewState = {
  originalText: string
  newText: string
  operationLabel: string
  from: number
  to: number
} | null

export function EditorContextMenu({ editor, bookId, chapterId, providerId, model }: EditorContextMenuProps) {
  const [menu, setMenu] = useState<MenuState>({ visible: false, x: 0, y: 0 })
  const [generating, setGenerating] = useState(false)
  const [stage, setStage] = useState<string | null>(null)
  const [reviewState, setReviewState] = useState<ReviewState>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const handleContextMenu = useCallback((e: MouseEvent) => {
    const target = e.target as HTMLElement
    if (!target.closest('.tiptap')) return
    e.preventDefault()
    setMenu({ visible: true, x: e.clientX, y: e.clientY })
  }, [])

  useEffect(() => {
    if (!menu.visible) return
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenu({ visible: false, x: 0, y: 0 })
      }
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [menu.visible])

  useEffect(() => {
    if (!editor || editor.isDestroyed || !editor.view) return
    const editorEl = editor.view.dom
    if (!editorEl) return
    editorEl.addEventListener('contextmenu', handleContextMenu)
    return () => editorEl.removeEventListener('contextmenu', handleContextMenu)
  }, [editor, handleContextMenu])

  const closeMenu = () => setMenu({ visible: false, x: 0, y: 0 })

  const hasSelection = !editor.state.selection.empty

  const onAiContinue = async () => {
    if (!providerId) {
      alert('请先在设置中配置 LLM Provider')
      closeMenu()
      return
    }
    closeMenu()
    setGenerating(true)
    const outlineNode = useOutlineStore.getState().getNodeForChapter(chapterId)
    await handleAiContinue({
      editor,
      bookId,
      chapterId,
      providerId,
      model,
      outlineTitle: outlineNode?.title ?? null,
      outlineDescription: outlineNode?.description ?? null,
      onStageChange: setStage,
      onStart: () => setGenerating(true),
      onComplete: () => { setGenerating(false); setStage(null) },
      onError: (err) => { setGenerating(false); setStage(null); logger.error('ai', `Context menu continue failed: ${err}`) },
    })
  }

  const onAiInlineOperation = async (operationKey: string) => {
    if (!providerId) {
      alert('请先在设置中配置 LLM Provider')
      closeMenu()
      return
    }

    const operation = AI_OPERATIONS[operationKey]
    if (!operation) return

    const { from, to } = editor.state.selection
    if (from === to) return

    const selectedText = editor.state.doc.textBetween(from, to, '\n')
    if (!selectedText.trim()) return

    closeMenu()
    setGenerating(true)
    setStage(operation.label)

    try {
      const newText = await generateAiText({
        providerId,
        model,
        prompt: operation.prompt,
        selectedText,
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
      setGenerating(false)
      setStage(null)
    }
  }

  const handleAccept = useCallback(() => {
    if (!reviewState) return
    const { from, to, newText } = reviewState
    editor.chain().focus().deleteRange({ from, to }).command(({ tr }) => {
      tr.insertText(newText, from)
      return true
    }).run()
    setReviewState(null)
  }, [editor, reviewState])

  const handleReject = useCallback(() => {
    setReviewState(null)
  }, [])

  const onStop = () => {
    stopGeneration()
    setGenerating(false)
    setStage(null)
  }

  if (!editor || editor.isDestroyed || !editor.view) return null

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

  return (
    <>
      {menu.visible && (
        <div
          ref={menuRef}
          style={{
            position: 'fixed',
            left: menu.x,
            top: menu.y,
            zIndex: 50,
            minWidth: '180px',
            borderRadius: 'var(--app-radius-lg)',
            background: 'var(--app-surface)',
            border: '1px solid var(--app-border)',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
            padding: '4px 0',
          }}
        >
          {/* Edit operations */}
          <MenuButton
            label="剪切"
            shortcut="Ctrl+X"
            disabled={!hasSelection}
            onClick={() => {
              document.execCommand('cut')
              closeMenu()
            }}
          />
          <MenuButton
            label="复制"
            shortcut="Ctrl+C"
            disabled={!hasSelection}
            onClick={() => {
              document.execCommand('copy')
              closeMenu()
            }}
          />
          <MenuButton
            label="粘贴"
            shortcut="Ctrl+V"
            onClick={() => {
              navigator.clipboard.readText().then((text) => {
                editor.chain().focus().insertContent(text).run()
              }).catch(() => {})
              closeMenu()
            }}
          />
          <MenuButton
            label="全选"
            shortcut="Ctrl+A"
            onClick={() => {
              editor.chain().focus().selectAll().run()
              closeMenu()
            }}
          />

          <MenuDivider />

          <MenuButton
            label="查找替换"
            shortcut="Ctrl+F"
            onClick={() => {
              window.dispatchEvent(new CustomEvent('editor:toggle-search'))
              closeMenu()
            }}
          />
          <MenuButton
            label="插入分割线"
            onClick={() => {
              editor.chain().focus().setHorizontalRule().run()
              closeMenu()
            }}
          />

          {/* AI operations */}
          {providerId && (
            <>
              <MenuDivider />
              <MenuLabel label="AI 操作" />
              <MenuButton
                label="✨ AI 续写"
                disabled={isGenerating()}
                onClick={onAiContinue}
              />
              {hasSelection && Object.values(AI_OPERATIONS).map((op) => (
                <MenuButton
                  key={op.name}
                  label={`✨ ${op.label}`}
                  disabled={isGenerating()}
                  onClick={() => onAiInlineOperation(op.name)}
                />
              ))}
            </>
          )}
        </div>
      )}

      {generating && (
        <div
          style={{
            position: 'fixed',
            bottom: '48px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '8px 16px',
            borderRadius: 'var(--app-radius-full)',
            background: 'var(--app-surface)',
            border: '1px solid var(--app-border)',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
            fontSize: '12px',
            color: 'var(--app-text-primary)',
          }}
        >
          <span style={{ animation: 'pulse 1.5s ease-in-out infinite' }}>✨</span>
          <span>{stage || '生成中...'}</span>
          <button
            onClick={onStop}
            style={{
              padding: '3px 10px',
              borderRadius: 'var(--app-radius-md)',
              border: 'none',
              background: 'var(--color-danger)',
              color: 'white',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            停止
          </button>
        </div>
      )}
    </>
  )
}

function MenuButton({
  label,
  shortcut,
  disabled,
  onClick,
}: {
  label: string
  shortcut?: string
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        padding: '6px 14px',
        border: 'none',
        background: 'transparent',
        cursor: disabled ? 'not-allowed' : 'pointer',
        color: disabled ? 'var(--app-text-muted)' : 'var(--app-text-primary)',
        fontSize: '12px',
        fontWeight: 500,
        opacity: disabled ? 0.4 : 1,
        transition: 'background 0.1s ease',
        textAlign: 'left',
      }}
      onMouseEnter={(e) => {
        if (!disabled) e.currentTarget.style.background = 'var(--app-surface-subtle)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent'
      }}
    >
      <span>{label}</span>
      {shortcut && (
        <span style={{ fontSize: '10px', color: 'var(--app-text-muted)', marginLeft: '16px' }}>
          {shortcut}
        </span>
      )}
    </button>
  )
}

function MenuDivider() {
  return (
    <div
      style={{
        height: '1px',
        margin: '4px 8px',
        background: 'var(--app-border)',
      }}
    />
  )
}

function MenuLabel({ label }: { label: string }) {
  return (
    <div
      style={{
        padding: '4px 14px 2px',
        fontSize: '9px',
        fontWeight: 700,
        color: 'var(--app-text-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
      }}
    >
      {label}
    </div>
  )
}
