import { useState, useCallback } from 'react'
import { ChevronUp, ChevronDown, Pencil, Check, X } from 'lucide-react'
import type { ChapterRow } from '@/core/db/repository'

interface ChapterTreeProps {
  chapters: ChapterRow[]
  currentChapterId: string | null
  onSelect: (chapter: ChapterRow) => void
  onDelete: (chapterId: string) => void
  onReorder?: (chapterId: string, newIndex: number) => void
  onRename?: (chapterId: string, newTitle: string) => void
}

export function ChapterTree({ chapters, currentChapterId, onSelect, onDelete, onReorder, onRename }: ChapterTreeProps) {
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')

  const handleDragStart = useCallback((e: React.DragEvent, chapterId: string) => {
    e.dataTransfer.effectAllowed = 'move'
    setDragId(chapterId)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, chapterId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverId(chapterId)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent, targetId: string) => {
      e.preventDefault()
      if (!dragId || dragId === targetId) return

      const sourceIdx = chapters.findIndex((c) => c.id === dragId)
      const targetIdx = chapters.findIndex((c) => c.id === targetId)

      if (sourceIdx !== -1 && targetIdx !== -1 && onReorder) {
        onReorder(dragId, targetIdx)
      }

      setDragId(null)
      setDragOverId(null)
    },
    [chapters, dragId, onReorder],
  )

  const handleDragEnd = useCallback(() => {
    setDragId(null)
    setDragOverId(null)
  }, [])

  const startRename = (ch: ChapterRow) => {
    setEditingId(ch.id)
    setEditingTitle(ch.title)
  }

  const confirmRename = () => {
    if (editingId && editingTitle.trim() && onRename) {
      onRename(editingId, editingTitle.trim())
    }
    setEditingId(null)
    setEditingTitle('')
  }

  const cancelRename = () => {
    setEditingId(null)
    setEditingTitle('')
  }

  const moveUp = (index: number) => {
    if (index > 0 && onReorder) {
      onReorder(chapters[index].id, index - 1)
    }
  }

  const moveDown = (index: number) => {
    if (index < chapters.length - 1 && onReorder) {
      onReorder(chapters[index].id, index + 1)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
      {chapters.map((ch, index) => {
        const isCurrent = ch.id === currentChapterId
        const isDragging = ch.id === dragId
        const isDragOver = ch.id === dragOverId
        const isEditing = ch.id === editingId

        return (
          <div
            key={ch.id}
            draggable={!isEditing}
            onDragStart={(e) => handleDragStart(e, ch.id)}
            onDragOver={(e) => handleDragOver(e, ch.id)}
            onDrop={(e) => handleDrop(e, ch.id)}
            onDragEnd={handleDragEnd}
            onClick={() => !isEditing && onSelect(ch)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '4px 6px',
              borderRadius: 'var(--app-radius-md)',
              cursor: isEditing ? 'default' : 'pointer',
              fontSize: '12px',
              transition: 'background 0.1s, color 0.1s',
              background: isCurrent ? 'var(--app-surface-subtle)' : isDragOver ? 'var(--color-brand-light)' : 'transparent',
              color: isCurrent ? 'var(--color-brand)' : 'var(--app-text-primary)',
              opacity: isDragging ? 0.5 : 1,
              borderLeft: isDragOver ? '2px solid var(--color-brand)' : '2px solid transparent',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', minWidth: 0, flex: 1 }}>
              <span style={{ fontSize: '10px', flexShrink: 0, color: 'var(--app-text-muted)', width: '18px', textAlign: 'center' }}>
                {index + 1}
              </span>
              {isEditing ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1 }}>
                  <input
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') confirmRename()
                      if (e.key === 'Escape') cancelRename()
                    }}
                    onClick={(e) => e.stopPropagation()}
                    autoFocus
                    style={{
                      flex: 1,
                      padding: '2px 6px',
                      borderRadius: 'var(--app-radius-sm)',
                      border: '1px solid var(--color-brand)',
                      background: 'var(--app-input-bg)',
                      color: 'var(--app-text-primary)',
                      fontSize: '12px',
                      outline: 'none',
                      minWidth: 0,
                    }}
                  />
                  <button
                    onClick={(e) => { e.stopPropagation(); confirmRename() }}
                    style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-success)', padding: '2px', display: 'flex' }}
                  >
                    <Check size={12} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); cancelRename() }}
                    style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--app-text-muted)', padding: '2px', display: 'flex' }}
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ch.title}</span>
              )}
            </div>

            {!isEditing && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '2px',
                  flexShrink: 0,
                  marginLeft: '4px',
                  opacity: isCurrent ? 1 : 0,
                  transition: 'opacity 0.15s ease',
                }}
                className="chapter-actions"
              >
                <button
                  onClick={(e) => { e.stopPropagation(); moveUp(index) }}
                  disabled={index === 0}
                  title="上移"
                  style={{
                    border: 'none',
                    background: 'none',
                    cursor: index === 0 ? 'not-allowed' : 'pointer',
                    color: 'var(--app-text-muted)',
                    padding: '2px',
                    display: 'flex',
                    opacity: index === 0 ? 0.3 : 0.7,
                  }}
                >
                  <ChevronUp size={11} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); moveDown(index) }}
                  disabled={index === chapters.length - 1}
                  title="下移"
                  style={{
                    border: 'none',
                    background: 'none',
                    cursor: index === chapters.length - 1 ? 'not-allowed' : 'pointer',
                    color: 'var(--app-text-muted)',
                    padding: '2px',
                    display: 'flex',
                    opacity: index === chapters.length - 1 ? 0.3 : 0.7,
                  }}
                >
                  <ChevronDown size={11} />
                </button>
                {onRename && (
                  <button
                    onClick={(e) => { e.stopPropagation(); startRename(ch) }}
                    title="重命名"
                    style={{
                      border: 'none',
                      background: 'none',
                      cursor: 'pointer',
                      color: 'var(--app-text-muted)',
                      padding: '2px',
                      display: 'flex',
                      opacity: 0.7,
                    }}
                  >
                    <Pencil size={10} />
                  </button>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(ch.id) }}
                  title="删除"
                  style={{
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    color: 'var(--color-danger)',
                    padding: '2px',
                    display: 'flex',
                    opacity: 0.7,
                  }}
                >
                  <X size={11} />
                </button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
