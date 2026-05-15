import { useState, useMemo } from 'react'
import { diffChars } from 'diff'
import type { AuditIssue } from '@/core/ai-engine/agents/audit-types'

interface DiffReviewPanelProps {
  issues: AuditIssue[]
  originalText: string
  revisedText?: string
  onAccept?: (issue: AuditIssue, revisedText: string) => void
  onReject?: (issue: AuditIssue) => void
}

export function DiffReviewPanel({ issues, originalText, revisedText, onAccept, onReject }: DiffReviewPanelProps) {
  const [acceptedIds, setAcceptedIds] = useState<Set<number>>(new Set())
  const [rejectedIds, setRejectedIds] = useState<Set<number>>(new Set())

  const diff = useMemo(() => {
    if (!revisedText) return null
    return diffChars(originalText, revisedText)
  }, [originalText, revisedText])

  const handleAccept = (idx: number) => {
    setAcceptedIds((prev) => new Set([...prev, idx]))
    onAccept?.(issues[idx], revisedText || originalText)
  }

  const handleReject = (idx: number) => {
    setRejectedIds((prev) => new Set([...prev, idx]))
    onReject?.(issues[idx])
  }

  const handleAcceptAll = () => {
    const newSet = new Set(issues.map((_, i) => i))
    setAcceptedIds(newSet)
    onAccept?.(issues[0], revisedText || originalText)
  }

  if (issues.length === 0) {
    return (
      <div style={{ padding: '16px', textAlign: 'center', fontSize: '12px', color: 'var(--app-text-muted)' }}>
        无需要审查的修改
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--app-text-primary)' }}>
          Diff 审查 ({issues.length} 项)
        </span>
        <button
          onClick={handleAcceptAll}
          style={{ fontSize: '10px', padding: '4px 8px', borderRadius: 'var(--app-radius)', backgroundColor: 'var(--app-bg-secondary)', color: 'var(--app-text-muted)', cursor: 'pointer', border: 'none' }}
        >
          全部接受
        </button>
      </div>

      {diff && (
        <div style={{ padding: '12px', borderRadius: 'var(--app-radius)', fontSize: '12px', lineHeight: '1.625', whiteSpace: 'pre-wrap', fontFamily: 'monospace', maxHeight: '160px', overflowY: 'auto', backgroundColor: 'var(--app-bg-secondary)' }}>
          {diff.map((seg, i) => {
            if (seg.added) {
              return (
                <span key={i} style={{ backgroundColor: 'oklch(0.7 0.15 145 / 0.3)', color: 'var(--app-text-primary)' }}>
                  {seg.value}
                </span>
              )
            }
            if (seg.removed) {
              return (
                <span key={i} style={{ backgroundColor: 'oklch(0.7 0.2 25 / 0.3)', textDecoration: 'line-through' }}>
                  {seg.value}
                </span>
              )
            }
            return <span key={i}>{seg.value}</span>
          })}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {issues.map((issue, i) => {
          const isAccepted = acceptedIds.has(i)
          const isRejected = rejectedIds.has(i)

          return (
            <div
              key={i}
              style={{
                padding: '8px',
                borderRadius: 'var(--app-radius)',
                fontSize: '11px',
                backgroundColor: isAccepted ? 'oklch(0.7 0.15 145 / 0.1)' : isRejected ? 'oklch(0.7 0.2 25 / 0.1)' : 'var(--app-bg-secondary)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <span
                  style={{
                    fontSize: '9px',
                    padding: '2px 4px',
                    borderRadius: 'var(--app-radius)',
                    flexShrink: 0,
                    backgroundColor: issue.severity === 'critical' ? 'oklch(0.7 0.2 25 / 0.2)' : 'oklch(0.7 0.15 80 / 0.2)',
                    color: issue.severity === 'critical' ? 'oklch(0.5 0.2 25)' : 'oklch(0.5 0.15 80)',
                  }}
                >
                  {issue.severity}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ color: 'var(--app-text-primary)' }}>{issue.description}</div>
                  {issue.suggestion && (
                    <div style={{ marginTop: '2px', color: 'var(--app-text-muted)' }}>
                      建议：{issue.suggestion}
                    </div>
                  )}
                </div>
              </div>

              {!isAccepted && !isRejected && (
                <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                  <button
                    onClick={() => handleAccept(i)}
                    style={{ fontSize: '10px', padding: '2px 8px', borderRadius: 'var(--app-radius)', backgroundColor: 'oklch(0.65 0.17 145)', color: 'white', cursor: 'pointer', border: 'none' }}
                  >
                    接受
                  </button>
                  <button
                    onClick={() => handleReject(i)}
                    style={{ fontSize: '10px', padding: '2px 8px', borderRadius: 'var(--app-radius)', backgroundColor: 'var(--app-bg-secondary)', color: 'var(--app-text-muted)', cursor: 'pointer', border: 'none' }}
                  >
                    拒绝
                  </button>
                </div>
              )}

              {isAccepted && <div style={{ marginTop: '4px', fontSize: '10px', color: 'oklch(0.65 0.17 145)' }}>✓ 已接受</div>}
              {isRejected && <div style={{ marginTop: '4px', fontSize: '10px', color: 'oklch(0.6 0.22 25)' }}>✗ 已拒绝</div>}
            </div>
          )
        })}
      </div>
    </div>
  )
}
