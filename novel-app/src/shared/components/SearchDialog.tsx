import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { searchBook, highlightQuery, type SearchResult } from '@/core/search/search-engine'
import { useBookshelfStore } from '@/modules'

interface SearchDialogProps {
  open: boolean
  onClose: () => void
}

export function SearchDialog({ open, onClose }: SearchDialogProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const selectedBookId = useBookshelfStore((s) => s.selectedBookId)

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  useEffect(() => {
    if (!query.trim() || !selectedBookId) {
      return
    }

    const timer = setTimeout(async () => {
      const res = await searchBook(selectedBookId, query)
      setResults(res)
      setSelectedIndex(0)
      setSearching(false)
    }, 300)

    return () => clearTimeout(timer)
  }, [query, selectedBookId])

  const handleSelect = useCallback(
    (result: SearchResult) => {
      navigate('/editor', { state: { bookId: selectedBookId, chapterId: result.chapterId } })
      onClose()
    },
    [navigate, selectedBookId, onClose],
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((prev) => Math.max(prev - 1, 0))
      } else if (e.key === 'Enter' && results[selectedIndex]) {
        handleSelect(results[selectedIndex])
      } else if (e.key === 'Escape') {
        onClose()
      }
    },
    [results, selectedIndex, handleSelect, onClose],
  )

  if (!open) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '15vh',
      }}
      onClick={onClose}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.3)',
        }}
      />

      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '480px',
          borderRadius: 'var(--app-radius-lg)',
          overflow: 'hidden',
          backgroundColor: 'var(--app-surface)',
          border: '1px solid var(--app-border)',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 16px',
            borderBottom: '1px solid var(--app-border)',
          }}
        >
          <span style={{ color: 'var(--app-text-muted)' }}>🔍</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="搜索内容..."
            style={{
              flex: 1,
              background: 'transparent',
              outline: 'none',
              fontSize: '13px',
              color: 'var(--app-text-primary)',
              border: 'none',
            }}
          />
          {searching && (
            <span style={{ fontSize: '11px', color: 'var(--app-text-muted)' }}>
              搜索中...
            </span>
          )}
        </div>

        <div style={{ maxHeight: '40vh', overflowY: 'auto' }}>
          {results.length === 0 && query.trim() && !searching ? (
            <div style={{ padding: '16px', textAlign: 'center', fontSize: '12px', color: 'var(--app-text-muted)' }}>
              未找到匹配内容
            </div>
          ) : (
            results.map((result, i) => (
              <button
                key={`${result.chapterId}-${result.position}`}
                onClick={() => handleSelect(result)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '10px 16px',
                  fontSize: '12px',
                  transition: 'background-color 0.1s ease',
                  backgroundColor: i === selectedIndex ? 'var(--app-bg-secondary)' : 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                <div style={{ fontWeight: 500, marginBottom: '4px', color: 'var(--app-text-primary)' }}>
                  {result.chapterTitle}
                </div>
                <div style={{ color: 'var(--app-text-muted)' }}>
                  <span>{result.contextBefore}</span>
                  <span
                    dangerouslySetInnerHTML={{
                      __html: highlightQuery(result.matchText, query),
                    }}
                  />
                  <span>{result.contextAfter}</span>
                </div>
              </button>
            ))
          )}
        </div>

        <div
          style={{
            padding: '8px 16px',
            borderTop: '1px solid var(--app-border)',
            fontSize: '10px',
            display: 'flex',
            justifyContent: 'space-between',
            color: 'var(--app-text-muted)',
          }}
        >
          <span>{results.length} 个结果</span>
          <span>↑↓ 导航 · Enter 选择 · Esc 关闭</span>
        </div>
      </div>
    </div>
  )
}
