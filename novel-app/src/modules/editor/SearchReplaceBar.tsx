import { useState, useCallback, useEffect, useRef } from 'react'
import type { Editor } from '@tiptap/react'
import { Search, Replace, ChevronUp, ChevronDown, X } from 'lucide-react'

interface SearchStorage {
  query: string
  replaceText: string
  currentIndex: number
  results: number[]
}

interface SearchReplaceBarProps {
  editor: Editor | null
  onClose: () => void
}

export function SearchReplaceBar({ editor, onClose }: SearchReplaceBarProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [replaceText, setReplaceText] = useState('')
  const [showReplace, setShowReplace] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    searchInputRef.current?.focus()
  }, [])

  const storage = (editor?.storage?.searchReplace ?? null) as SearchStorage | null
  const resultCount = storage?.results?.length ?? 0
  const currentIndex = storage?.currentIndex ?? 0

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchQuery(value)
      if (editor) {
        editor.commands.setSearchQuery(value)
      }
    },
    [editor],
  )

  const handleFindNext = useCallback(() => {
    editor?.commands.findNext()
  }, [editor])

  const handleFindPrev = useCallback(() => {
    editor?.commands.findPrev()
  }, [editor])

  const handleReplaceCurrent = useCallback(() => {
    editor?.commands.replaceCurrent()
  }, [editor])

  const handleReplaceAll = useCallback(() => {
    editor?.commands.replaceAll()
  }, [editor])

  const handleClear = useCallback(() => {
    setSearchQuery('')
    setReplaceText('')
    editor?.commands.clearSearch()
    onClose()
  }, [editor, onClose])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClear()
      } else if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleFindNext()
      } else if (e.key === 'Enter' && e.shiftKey) {
        e.preventDefault()
        handleFindPrev()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleClear, handleFindNext, handleFindPrev])

  return (
    <div
      style={{
        position: 'absolute',
        top: '8px',
        right: '16px',
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        padding: '10px 12px',
        borderRadius: 'var(--app-radius-lg)',
        background: 'var(--app-surface)',
        border: '1px solid var(--app-border)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
        minWidth: '320px',
        fontSize: '12px',
      }}
    >
      {/* Search row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <Search size={13} style={{ color: 'var(--app-text-muted)', flexShrink: 0 }} />
        <input
          ref={searchInputRef}
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="查找..."
          style={{
            flex: 1,
            padding: '4px 8px',
            borderRadius: 'var(--app-radius-md)',
            border: '1px solid var(--app-border)',
            background: 'var(--app-input-bg)',
            color: 'var(--app-text-primary)',
            fontSize: '12px',
            outline: 'none',
            fontFamily: 'inherit',
          }}
        />
        <span style={{ fontSize: '11px', color: 'var(--app-text-muted)', whiteSpace: 'nowrap', minWidth: '40px', textAlign: 'center' }}>
          {searchQuery ? `${currentIndex + 1}/${resultCount}` : '0/0'}
        </span>
        <button
          onClick={handleFindPrev}
          disabled={resultCount === 0}
          className="btn-icon"
          style={{ width: '24px', height: '24px', opacity: resultCount > 0 ? 1 : 0.4 }}
          title="上一个 (Shift+Enter)"
        >
          <ChevronUp size={13} />
        </button>
        <button
          onClick={handleFindNext}
          disabled={resultCount === 0}
          className="btn-icon"
          style={{ width: '24px', height: '24px', opacity: resultCount > 0 ? 1 : 0.4 }}
          title="下一个 (Enter)"
        >
          <ChevronDown size={13} />
        </button>
        <button
          onClick={() => setShowReplace((v) => !v)}
          className="btn-icon"
          style={{ width: '24px', height: '24px', color: showReplace ? 'var(--color-brand)' : 'var(--app-text-muted)' }}
          title="替换"
        >
          <Replace size={13} />
        </button>
        <button
          onClick={handleClear}
          className="btn-icon"
          style={{ width: '24px', height: '24px' }}
          title="关闭 (Escape)"
        >
          <X size={13} />
        </button>
      </div>

      {/* Replace row */}
      {showReplace && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Replace size={13} style={{ color: 'var(--app-text-muted)', flexShrink: 0, opacity: 0 }} />
          <input
            value={replaceText}
            onChange={(e) => {
              setReplaceText(e.target.value)
              if (editor) editor.commands.setReplaceText(e.target.value)
            }}
            placeholder="替换为..."
            style={{
              flex: 1,
              padding: '4px 8px',
              borderRadius: 'var(--app-radius-md)',
              border: '1px solid var(--app-border)',
              background: 'var(--app-input-bg)',
              color: 'var(--app-text-primary)',
              fontSize: '12px',
              outline: 'none',
              fontFamily: 'inherit',
            }}
          />
          <button
            onClick={handleReplaceCurrent}
            disabled={resultCount === 0}
            style={{
              padding: '3px 8px',
              borderRadius: 'var(--app-radius-md)',
              border: '1px solid var(--app-border)',
              background: 'var(--app-surface)',
              color: 'var(--app-text-primary)',
              fontSize: '11px',
              fontWeight: 600,
              cursor: resultCount > 0 ? 'pointer' : 'not-allowed',
              opacity: resultCount > 0 ? 1 : 0.4,
              whiteSpace: 'nowrap',
            }}
          >
            替换
          </button>
          <button
            onClick={handleReplaceAll}
            disabled={resultCount === 0}
            style={{
              padding: '3px 8px',
              borderRadius: 'var(--app-radius-md)',
              border: '1px solid var(--app-border)',
              background: 'var(--app-surface)',
              color: 'var(--app-text-primary)',
              fontSize: '11px',
              fontWeight: 600,
              cursor: resultCount > 0 ? 'pointer' : 'not-allowed',
              opacity: resultCount > 0 ? 1 : 0.4,
              whiteSpace: 'nowrap',
            }}
          >
            全部替换
          </button>
        </div>
      )}
    </div>
  )
}
