import { useMemo } from 'react'
import { computeDiff, type DiffSegment } from './diff-utils'

interface DiffReviewOverlayProps {
  originalText: string
  newText: string
  operationLabel: string
  onAccept: () => void
  onReject: () => void
}

export function DiffReviewOverlay({
  originalText,
  newText,
  operationLabel,
  onAccept,
  onReject,
}: DiffReviewOverlayProps) {
  const diffSegments = useMemo(() => computeDiff(originalText, newText), [originalText, newText])

  const stats = useMemo(() => {
    let added = 0
    let removed = 0
    for (const seg of diffSegments) {
      if (seg.type === 'added') added += [...seg.text].length
      if (seg.type === 'removed') removed += [...seg.text].length
    }
    return { added, removed }
  }, [diffSegments])

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(4px)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onReject() }}
    >
      <div
        style={{
          width: '90%',
          maxWidth: '800px',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--app-surface)',
          borderRadius: 'var(--app-radius-lg)',
          border: '1px solid var(--app-border)',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 20px',
            borderBottom: '1px solid var(--app-border)',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span
              style={{
                padding: '3px 10px',
                borderRadius: 'var(--app-radius-full)',
                background: 'var(--color-brand-light)',
                color: 'var(--color-brand)',
                fontSize: '11px',
                fontWeight: 700,
              }}
            >
              {operationLabel}
            </span>
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--app-text-primary)' }}>
              AI 修改审查
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '11px', color: 'var(--app-text-muted)' }}>
            <span style={{ color: 'var(--color-success)' }}>+{stats.added}字</span>
            <span style={{ color: 'var(--color-danger)' }}>-{stats.removed}字</span>
          </div>
        </div>

        {/* Diff content */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            padding: '16px 20px',
          }}
        >
          <DiffView segments={diffSegments} />
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '10px',
            padding: '12px 20px',
            borderTop: '1px solid var(--app-border)',
            flexShrink: 0,
          }}
        >
          <button
            onClick={onReject}
            style={{
              padding: '8px 20px',
              borderRadius: 'var(--app-radius-md)',
              border: '1px solid var(--app-border)',
              background: 'transparent',
              color: 'var(--app-text-muted)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--app-surface-subtle)'
              e.currentTarget.style.color = 'var(--app-text-primary)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = 'var(--app-text-muted)'
            }}
          >
            拒绝修改
          </button>
          <button
            onClick={onAccept}
            style={{
              padding: '8px 24px',
              borderRadius: 'var(--app-radius-md)',
              border: 'none',
              background: 'var(--color-brand)',
              color: 'var(--app-text-inverse)',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              boxShadow: 'var(--app-shadow-brand)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--color-brand-hover)'
              e.currentTarget.style.transform = 'translateY(-1px)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--color-brand)'
              e.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            接受修改
          </button>
        </div>
      </div>
    </div>
  )
}

function DiffView({ segments }: { segments: DiffSegment[] }) {
  return (
    <div
      style={{
        fontFamily: "'Noto Serif SC', 'Source Han Serif SC', serif",
        fontSize: '14px',
        lineHeight: 1.8,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-all',
      }}
    >
      {segments.map((seg, i) => {
        if (seg.type === 'equal') {
          return <span key={i}>{seg.text}</span>
        }
        if (seg.type === 'removed') {
          return (
            <span
              key={i}
              style={{
                background: 'var(--color-danger-light)',
                color: 'var(--color-danger)',
                textDecoration: 'line-through',
                textDecorationThickness: '2px',
                borderRadius: '2px',
                padding: '0 1px',
              }}
            >
              {seg.text}
            </span>
          )
        }
        if (seg.type === 'added') {
          return (
            <span
              key={i}
              style={{
                background: 'var(--color-success-dim)',
                color: 'var(--color-success)',
                borderRadius: '2px',
                padding: '0 1px',
              }}
            >
              {seg.text}
            </span>
          )
        }
        return null
      })}
    </div>
  )
}
