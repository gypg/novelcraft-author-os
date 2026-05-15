import { useState, useEffect, useMemo } from 'react'
import { useEditorStore, useBookshelfStore, useAICollabStore } from '@/modules'
import { queryTemporalFactsAtChapter, type TemporalFactRow } from '@/core/db/temporal-memory-repository'
import { ContextBudgetPanel } from '@/modules/ai-collab/ContextBudgetPanel'
import type { ChatMessage } from '@/core/ai-engine/providers'

export function ContextPanel() {
  const { currentChapterId } = useEditorStore()
  const selectedBookId = useBookshelfStore((s) => s.selectedBookId)
  const aiMessages = useAICollabStore((s) => s.messages)
  const [facts, setFacts] = useState<TemporalFactRow[]>([])

  useEffect(() => {
    if (!selectedBookId || !currentChapterId) return
    let cancelled = false
    queryTemporalFactsAtChapter(selectedBookId, 9999)
      .then((f) => { if (!cancelled) setFacts(f) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [selectedBookId, currentChapterId])

  const providerMessages: ChatMessage[] = useMemo(() =>
    aiMessages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
  [aiMessages])

  const tokenSummary = useMemo(() => {
    const totalChars = aiMessages.reduce((sum, m) => sum + m.content.length, 0)
    const totalTokens = aiMessages.reduce((sum, m) => sum + (m.metadata?.tokenUsage || 0), 0)
    const totalCost = aiMessages.reduce((sum, m) => sum + (m.metadata?.cost || 0), 0)
    return { totalChars, totalTokens, totalCost, messageCount: aiMessages.length }
  }, [aiMessages])

  if (!selectedBookId || !currentChapterId) {
    return (
      <div style={{ padding: '16px', textAlign: 'center', fontSize: '12px', color: 'var(--app-text-muted)' }}>
        请先选择一本书和章节
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Session stats */}
      <div
        style={{
          padding: '10px 14px',
          borderBottom: '1px solid var(--app-border)',
          flexShrink: 0,
        }}
      >
        <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--app-text-primary)', marginBottom: '8px' }}>
          会话统计
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
          <StatCard label="消息数" value={String(tokenSummary.messageCount)} />
          <StatCard label="总字符" value={tokenSummary.totalChars.toLocaleString()} />
          <StatCard label="预估 Token" value={tokenSummary.totalTokens > 0 ? tokenSummary.totalTokens.toLocaleString() : '—'} />
          <StatCard label="预估费用" value={tokenSummary.totalCost > 0 ? `¥${tokenSummary.totalCost.toFixed(4)}` : '—'} />
        </div>
      </div>

      {/* Context budget */}
      <div style={{ flexShrink: 0, borderBottom: '1px solid var(--app-border)' }}>
        <ContextBudgetPanel messages={providerMessages} />
      </div>

      {/* Temporal facts */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '10px 14px' }}>
        <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--app-text-primary)', marginBottom: '8px' }}>
          时序记忆 ({facts.length} 条)
        </div>
        {facts.length === 0 ? (
          <div style={{ fontSize: '11px', color: 'var(--app-text-muted)' }}>
            暂无时序记忆数据。写作时 AI 会自动提取事实。
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {facts.slice(0, 30).map((fact) => (
              <div
                key={fact.id}
                style={{
                  padding: '4px 8px',
                  borderRadius: 'var(--app-radius-md)',
                  background: 'var(--app-surface-subtle)',
                  fontSize: '10px',
                  lineHeight: 1.5,
                }}
              >
                <span style={{ color: 'var(--app-text-primary)', fontWeight: 600 }}>{fact.subject}</span>
                {' '}
                <span style={{ color: 'var(--app-text-muted)' }}>{fact.predicate}</span>
                {' '}
                <span style={{ color: 'var(--app-text-primary)' }}>{fact.object}</span>
                <span style={{ color: 'var(--app-text-muted)', marginLeft: '4px' }}>
                  (ch.{fact.valid_from_chapter})
                </span>
              </div>
            ))}
            {facts.length > 30 && (
              <div style={{ fontSize: '10px', color: 'var(--app-text-muted)', textAlign: 'center', padding: '4px' }}>
                还有 {facts.length - 30} 条...
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        padding: '6px 8px',
        borderRadius: 'var(--app-radius-md)',
        background: 'var(--app-surface-subtle)',
      }}
    >
      <div style={{ fontSize: '9px', fontWeight: 600, color: 'var(--app-text-muted)', marginBottom: '2px' }}>
        {label}
      </div>
      <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--app-text-primary)' }}>
        {value}
      </div>
    </div>
  )
}
