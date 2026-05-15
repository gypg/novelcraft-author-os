import { useMemo } from 'react'
import { estimateMessageTokens, allocateBudget } from '@/core/ai-engine/context-budget'
import type { ChatMessage } from '@/core/ai-engine/providers'

interface ContextBudgetPanelProps {
  messages: ChatMessage[]
  maxTokens?: number
}

const LAYER_LABELS: Record<string, string> = {
  core: '核心设定',
  recent: '近期内容',
  history: '历史检索',
  conversation: '对话历史',
  reserve: '生成预留',
}

const LAYER_COLORS: Record<string, string> = {
  core: 'oklch(0.65 0.17 145)',
  recent: 'oklch(0.6 0.12 250)',
  history: 'oklch(0.7 0.15 80)',
  conversation: 'oklch(0.6 0.18 30)',
  reserve: 'oklch(0.7 0.1 0)',
}

export function ContextBudgetPanel({ messages, maxTokens = 8000 }: ContextBudgetPanelProps) {
  const budget = useMemo(() => allocateBudget({ maxTokens }), [maxTokens])
  const tokenEstimate = useMemo(() => estimateMessageTokens(messages), [messages])

  const usedTokens = tokenEstimate.total
  const utilization = Math.min(100, Math.round((usedTokens / maxTokens) * 100))
  const remaining = Math.max(0, maxTokens - usedTokens)

  return (
    <div className="space-y-3 p-3">
      {/* Header */}
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium" style={{ color: 'var(--foreground)' }}>上下文预算</span>
        <span style={{ color: 'var(--muted-foreground)' }}>
          {usedTokens.toLocaleString()} / {maxTokens.toLocaleString()} tokens
        </span>
      </div>

      {/* Utilization bar */}
      <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--muted)' }}>
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${utilization}%`,
            backgroundColor: utilization > 90 ? 'oklch(0.6 0.22 25)' : utilization > 70 ? 'oklch(0.75 0.15 80)' : 'oklch(0.65 0.17 145)',
          }}
        />
      </div>

      {/* Layer breakdown */}
      <div className="space-y-1.5">
        {Object.entries(budget).map(([layer, tokens]) => (
          <div key={layer} className="flex items-center gap-2 text-[11px]">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: LAYER_COLORS[layer] || 'var(--muted-foreground)' }}
            />
            <span className="w-16" style={{ color: 'var(--muted-foreground)' }}>
              {LAYER_LABELS[layer] || layer}
            </span>
            <div className="flex-1 h-1.5 rounded" style={{ backgroundColor: 'var(--muted)' }}>
              <div
                className="h-full rounded"
                style={{
                  width: `${(tokens / maxTokens) * 100}%`,
                  backgroundColor: LAYER_COLORS[layer] || 'var(--muted-foreground)',
                }}
              />
            </div>
            <span className="w-10 text-right" style={{ color: 'var(--muted-foreground)' }}>
              {tokens}
            </span>
          </div>
        ))}
      </div>

      {/* Token by role */}
      <div className="border-t pt-2" style={{ borderColor: 'var(--border)' }}>
        <div className="text-[10px] mb-1" style={{ color: 'var(--muted-foreground)' }}>按角色统计</div>
        {Object.entries(tokenEstimate.byRole).map(([role, tokens]) => (
          <div key={role} className="flex justify-between text-[11px]">
            <span style={{ color: 'var(--muted-foreground)' }}>{role}</span>
            <span style={{ color: 'var(--foreground)' }}>{tokens}</span>
          </div>
        ))}
      </div>

      {/* Remaining */}
      <div className="text-[10px] text-center" style={{ color: remaining < 500 ? 'oklch(0.6 0.22 25)' : 'var(--muted-foreground)' }}>
        剩余 {remaining.toLocaleString()} tokens
      </div>
    </div>
  )
}
