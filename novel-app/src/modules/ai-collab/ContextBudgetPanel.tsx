import { useMemo } from 'react'
import { estimateMessageTokens, allocateBudget } from '@/core/ai-engine/context-budget'
import type { ChatMessage } from '@/core/ai-engine/providers'
import { useContextDiagnosticsStore } from './context-diagnostics-store'

interface ContextBudgetPanelProps {
  messages: ChatMessage[]
  maxTokens?: number
  bookId?: string
  chapterId?: string
}

type DisplayMode = 'real' | 'fallback' | 'stale' | 'empty'

const REAL_LAYER_CONFIG = [
  { key: 'truthFilesTokens' as const, label: '真相文件', color: 'oklch(0.65 0.17 145)' },
  { key: 'temporalFactsTokens' as const, label: '时序事实', color: 'oklch(0.6 0.12 250)' },
  { key: 'authorMemoryTokens' as const, label: '作者记忆', color: 'oklch(0.7 0.15 80)' },
  { key: 'knowledgeTokens' as const, label: '知识检索', color: 'oklch(0.6 0.18 30)' },
  { key: 'recentSummaryTokens' as const, label: '前文回顾', color: 'oklch(0.7 0.1 0)' },
  { key: 'currentTailTokens' as const, label: '当前内容', color: 'oklch(0.55 0.15 300)' },
]

const FALLBACK_LAYER_LABELS: Record<string, string> = {
  core: '核心设定',
  recent: '近期内容',
  history: '历史检索',
  conversation: '对话历史',
  reserve: '生成预留',
}

const FALLBACK_LAYER_COLORS: Record<string, string> = {
  core: 'oklch(0.65 0.17 145)',
  recent: 'oklch(0.6 0.12 250)',
  history: 'oklch(0.7 0.15 80)',
  conversation: 'oklch(0.6 0.18 30)',
  reserve: 'oklch(0.7 0.1 0)',
}

export function ContextBudgetPanel({ messages, maxTokens = 16000, bookId, chapterId }: ContextBudgetPanelProps) {
  const { budgetReport, isStale } = useContextDiagnosticsStore()

  // Determine display mode
  const displayMode = useMemo((): DisplayMode => {
    if (!budgetReport) {
      return messages.length === 0 ? 'empty' : 'fallback'
    }
    if (bookId && chapterId && isStale(bookId, chapterId)) {
      return 'stale'
    }
    return 'real'
  }, [budgetReport, bookId, chapterId, isStale, messages.length])

  // Calculate tokens based on mode
  const { usedTokens, layers } = useMemo(() => {
    if (displayMode === 'real' && budgetReport) {
      const realLayers = REAL_LAYER_CONFIG.map((config) => ({
        key: config.key,
        label: config.label,
        color: config.color,
        tokens: budgetReport[config.key],
      }))
      const total = realLayers.reduce((sum, layer) => sum + layer.tokens, 0)
      return { usedTokens: total, layers: realLayers }
    }

    // Fallback mode
    const budget = allocateBudget({ maxTokens })
    const fallbackLayers = Object.entries(budget).map(([key, tokens]) => ({
      key,
      label: FALLBACK_LAYER_LABELS[key] || key,
      color: FALLBACK_LAYER_COLORS[key] || 'var(--muted-foreground)',
      tokens,
    }))
    const tokenEstimate = estimateMessageTokens(messages)
    return { usedTokens: tokenEstimate.total, layers: fallbackLayers }
  }, [displayMode, budgetReport, maxTokens, messages])

  const utilization = Math.min(100, Math.round((usedTokens / maxTokens) * 100))
  const remaining = Math.max(0, maxTokens - usedTokens)

  // Warning level
  const warningLevel = utilization > 90 ? 'high' : utilization > 70 ? 'medium' : 'none'
  const barColor =
    warningLevel === 'high'
      ? 'oklch(0.6 0.22 25)'
      : warningLevel === 'medium'
        ? 'oklch(0.75 0.15 80)'
        : 'oklch(0.65 0.17 145)'

  // State badge
  const stateBadge = {
    real: { label: '实时', color: 'oklch(0.65 0.17 145)' },
    fallback: { label: '估算', color: 'oklch(0.7 0.1 0)' },
    stale: { label: '过期', color: 'oklch(0.75 0.15 80)' },
    empty: { label: '未运行', color: 'var(--muted-foreground)' },
  }[displayMode]

  return (
    <div className="space-y-3 p-3">
      {/* Header */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="font-medium" style={{ color: 'var(--foreground)' }}>
            上下文预算
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
        <span style={{ color: 'var(--muted-foreground)' }}>
          {usedTokens.toLocaleString()} / {maxTokens.toLocaleString()}
        </span>
      </div>

      {/* Utilization bar */}
      <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--muted)' }}>
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${utilization}%`,
            backgroundColor: barColor,
          }}
        />
      </div>

      {/* Warning message */}
      {warningLevel === 'high' && (
        <div className="text-[10px] px-2 py-1 rounded" style={{ backgroundColor: 'oklch(0.6 0.22 25)' + '20', color: 'oklch(0.6 0.22 25)' }}>
          预算不足，建议启用压缩或精简上下文
        </div>
      )}
      {warningLevel === 'medium' && (
        <div className="text-[10px] px-2 py-1 rounded" style={{ backgroundColor: 'oklch(0.75 0.15 80)' + '20', color: 'oklch(0.75 0.15 80)' }}>
          预算偏紧，注意控制上下文规模
        </div>
      )}

      {/* Layer breakdown */}
      <div className="space-y-1.5">
        {layers.map((layer) => (
          <div key={layer.key} className="flex items-center gap-2 text-[11px]">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: layer.color }}
            />
            <span className="w-16" style={{ color: 'var(--muted-foreground)' }}>
              {layer.label}
            </span>
            <div className="flex-1 h-1.5 rounded" style={{ backgroundColor: 'var(--muted)' }}>
              <div
                className="h-full rounded"
                style={{
                  width: `${Math.min(100, (layer.tokens / maxTokens) * 100)}%`,
                  backgroundColor: layer.color,
                }}
              />
            </div>
            <span className="w-10 text-right" style={{ color: 'var(--muted-foreground)' }}>
              {layer.tokens}
            </span>
          </div>
        ))}
      </div>

      {/* Remaining */}
      <div
        className="text-[10px] text-center"
        style={{
          color: remaining < 500 ? 'oklch(0.6 0.22 25)' : 'var(--muted-foreground)',
        }}
      >
        剩余 {remaining.toLocaleString()} tokens
      </div>
    </div>
  )
}
