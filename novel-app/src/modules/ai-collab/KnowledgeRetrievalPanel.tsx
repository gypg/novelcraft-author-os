import { useMemo, useState } from 'react'
import { useContextDiagnosticsStore } from './context-diagnostics-store'
import type { RetrievalDiagnosticDTO } from './context-diagnostics-store'

interface KnowledgeRetrievalPanelProps {
  bookId?: string
  chapterId?: string
}

type DisplayMode = 'real' | 'stale' | 'empty'

const LIBRARY_TYPE_CONFIG = {
  project: { label: '项目', color: 'oklch(0.6 0.18 250)' },
  author: { label: '作者', color: 'oklch(0.65 0.15 145)' },
  external: { label: '外部', color: 'oklch(0.7 0.17 50)' },
}

const REDACTION_STATE_CONFIG = {
  explicit: { icon: '🔓', tooltip: '完整内容' },
  'redacted-summary': { icon: '🔒', tooltip: '脱敏摘要' },
  'redacted-forbidden': { icon: '🛡️', tooltip: '禁止引用' },
}

interface KnowledgeRetrievalItemProps {
  item: RetrievalDiagnosticDTO
  isExpanded: boolean
  onToggle: () => void
}

function KnowledgeRetrievalItem({ item, isExpanded, onToggle }: KnowledgeRetrievalItemProps) {
  const libraryConfig = LIBRARY_TYPE_CONFIG[item.libraryType] || { label: item.libraryType, color: 'var(--muted-foreground)' }
  const redactionConfig = REDACTION_STATE_CONFIG[item.redactionState]
  const scorePercent = Math.round(item.score * 100)

  return (
    <div
      className="border rounded-lg p-2.5 cursor-pointer hover:bg-opacity-50 transition-colors"
      style={{ borderColor: 'var(--border)', backgroundColor: 'var(--muted)' + '10' }}
      onClick={onToggle}
    >
      {/* Header: Icon, Title, Library Badge, Score */}
      <div className="flex items-start gap-2 mb-2">
        <span className="text-sm" title={redactionConfig.tooltip}>
          {redactionConfig.icon}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="text-xs font-medium truncate"
              style={{ color: 'var(--foreground)' }}
              title={item.displayTitle}
            >
              {item.displayTitle}
            </span>
            <span
              className="px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0"
              style={{
                backgroundColor: libraryConfig.color + '20',
                color: libraryConfig.color,
              }}
            >
              {libraryConfig.label}
            </span>
          </div>
          {/* Score bar */}
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--muted)' }}>
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${scorePercent}%`,
                  backgroundColor: libraryConfig.color,
                }}
              />
            </div>
            <span className="text-[11px] font-medium w-10 text-right" style={{ color: libraryConfig.color }}>
              {item.score.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Expanded: Score Breakdown */}
      {isExpanded && (
        <div
          className="mt-2 pt-2 border-t space-y-1"
          style={{ borderColor: 'var(--border)' }}
        >
          <div className="text-[10px] font-medium mb-1.5" style={{ color: 'var(--muted-foreground)' }}>
            分数构成
          </div>
          {Object.entries(item.scoreBreakdown).map(([key, value]) => (
            <div key={key} className="flex justify-between text-[11px]">
              <span style={{ color: 'var(--muted-foreground)' }}>
                {key === 'bm25' && 'BM25 相关性'}
                {key === 'libraryWeight' && '库权重'}
                {key === 'canonicalWeight' && '权威性'}
                {key === 'quotePolicyWeight' && '引用策略'}
                {key === 'recencyWeight' && '时效性'}
                {key === 'final' && '最终分数'}
              </span>
              <span style={{ color: 'var(--foreground)' }}>{value.toFixed(3)}</span>
            </div>
          ))}
          {item.displaySummary && (
            <div className="mt-2 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
              <div className="text-[10px] font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>
                摘要
              </div>
              <div className="text-[11px]" style={{ color: 'var(--foreground)' }}>
                {item.displaySummary}
              </div>
            </div>
          )}
          {item.displayKeywords.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {item.displayKeywords.map((keyword, idx) => (
                <span
                  key={idx}
                  className="px-1.5 py-0.5 rounded text-[10px]"
                  style={{
                    backgroundColor: 'var(--muted)',
                    color: 'var(--muted-foreground)',
                  }}
                >
                  {keyword}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function KnowledgeRetrievalPanel({ bookId, chapterId }: KnowledgeRetrievalPanelProps) {
  const { retrievalDiagnostics, isStale } = useContextDiagnosticsStore()
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  // Determine display mode
  const displayMode = useMemo((): DisplayMode => {
    if (!retrievalDiagnostics || retrievalDiagnostics.length === 0) {
      return 'empty'
    }
    if (bookId && chapterId && isStale(bookId, chapterId)) {
      return 'stale'
    }
    return 'real'
  }, [retrievalDiagnostics, bookId, chapterId, isStale])

  // State badge
  const stateBadge = {
    real: { label: '实时', color: 'oklch(0.65 0.17 145)' },
    stale: { label: '过期', color: 'oklch(0.75 0.15 80)' },
    empty: { label: '未运行', color: 'var(--muted-foreground)' },
  }[displayMode]

  const handleToggle = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  return (
    <div className="space-y-3 p-3">
      {/* Header */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="font-medium" style={{ color: 'var(--foreground)' }}>
            知识检索
          </span>
          <span
            className="px-1.5 py-0.5 rounded text-[10px] font-medium"
            style={{
              backgroundColor: stateBadge.color + '20',
              color: stateBadge.color,
            }}
          >
            {stateBadge.label}
          </span>
        </div>
        {retrievalDiagnostics && retrievalDiagnostics.length > 0 && (
          <span style={{ color: 'var(--muted-foreground)' }}>
            {retrievalDiagnostics.length} 项
          </span>
        )}
      </div>

      {/* Empty state */}
      {displayMode === 'empty' && (
        <div
          className="text-center py-8 text-[11px]"
          style={{ color: 'var(--muted-foreground)' }}
        >
          未检索到知识项
        </div>
      )}

      {/* Item list */}
      {retrievalDiagnostics && retrievalDiagnostics.length > 0 && (
        <div className="space-y-2">
          {retrievalDiagnostics.map((item) => (
            <KnowledgeRetrievalItem
              key={item.id}
              item={item}
              isExpanded={expandedIds.has(item.id)}
              onToggle={() => handleToggle(item.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
