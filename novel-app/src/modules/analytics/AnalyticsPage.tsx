import { useEffect, useState, useMemo } from 'react'
import { BarChart3, TrendingUp, Zap, Coins } from 'lucide-react'
import { listChapters } from '@/core/db/repository'
import { useAnalyticsStore } from './store'
import { useBookshelfStore, useAICollabStore } from '@/modules'
import { runAllDetections, type DuplicateResult } from '@/core/analytics/duplicate-detector'
import { EmptyState } from '@/shared/components/EmptyState'

function StatCard({ label, value, icon, accent }: { label: string; value: string | number; icon?: React.ReactNode; accent?: string }) {
  return (
    <div
      style={{
        padding: '14px 16px',
        borderRadius: 'var(--app-radius-lg)',
        background: 'var(--app-surface)',
        border: '1px solid var(--app-border)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
        {icon && <span style={{ color: accent || 'var(--app-text-muted)', fontSize: '12px' }}>{icon}</span>}
        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--app-text-muted)' }}>{label}</span>
      </div>
      <div style={{ fontSize: '20px', fontWeight: 700, color: accent || 'var(--app-text-primary)' }}>{value}</div>
    </div>
  )
}

function BarChart({ data, maxValue, color }: { data: Array<{ label: string; value: number }>; maxValue: number; color?: string }) {
  if (data.length === 0) return null

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '100px' }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
          <div
            style={{
              width: '100%',
              borderRadius: '2px 2px 0 0',
              height: `${maxValue > 0 ? (d.value / maxValue) * 100 : 0}%`,
              backgroundColor: color || 'var(--color-brand)',
              minHeight: d.value > 0 ? '3px' : '0',
              transition: 'height 0.3s ease',
            }}
          />
          <span style={{ fontSize: '8px', color: 'var(--app-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%', textAlign: 'center' }}>
            {d.label.slice(5)}
          </span>
        </div>
      ))}
    </div>
  )
}

function WritingHeatmap({ chapters }: { chapters: Array<{ title: string; content: string; created_at?: number | string; updated_at?: number | string }> }) {
  const heatmapData = useMemo(() => {
    const dayMap = new Map<string, number>()
    const now = new Date()
    for (let i = 89; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      dayMap.set(key, 0)
    }

    for (const ch of chapters) {
      const dateStr = ch.updated_at || ch.created_at
      if (!dateStr) continue
      let day: string
      if (typeof dateStr === 'number') {
        const d = new Date(dateStr)
        day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      } else {
        day = String(dateStr).slice(0, 10)
      }
      const current = dayMap.get(day)
      if (current !== undefined) {
        dayMap.set(day, current + (ch.content?.length || 0))
      }
    }

    const maxWords = Math.max(...dayMap.values(), 1)
    const entries = Array.from(dayMap.entries())

    const weeks: Array<Array<{ date: string; count: number; level: number }>> = []
    let currentWeek: Array<{ date: string; count: number; level: number }> = []

    for (const [date, count] of entries) {
      const level = count === 0 ? 0 : count < maxWords * 0.25 ? 1 : count < maxWords * 0.5 ? 2 : count < maxWords * 0.75 ? 3 : 4
      currentWeek.push({ date, count, level })
      if (currentWeek.length === 7) {
        weeks.push(currentWeek)
        currentWeek = []
      }
    }
    if (currentWeek.length > 0) weeks.push(currentWeek)

    return { weeks, maxWords }
  }, [chapters])

  const LEVEL_COLORS = [
    'var(--app-surface-subtle)',
    'var(--color-brand-dim, oklch(0.85 0.06 250))',
    'var(--color-brand-light, oklch(0.7 0.1 250))',
    'var(--color-brand, oklch(0.6 0.15 250))',
    'var(--color-brand-hover, oklch(0.5 0.2 250))',
  ]

  return (
    <div>
      <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--app-text-primary)', marginBottom: '8px' }}>
        写作热力图（近 90 天）
      </div>
      <div style={{ display: 'flex', gap: '2px', overflowX: 'auto' }}>
        {heatmapData.weeks.map((week, wi) => (
          <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {week.map((day, di) => (
              <div
                key={di}
                title={`${day.date}: ${day.count} 字`}
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '2px',
                  background: LEVEL_COLORS[day.level],
                }}
              />
            ))}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px', fontSize: '9px', color: 'var(--app-text-muted)' }}>
        <span>少</span>
        {LEVEL_COLORS.map((c, i) => (
          <div key={i} style={{ width: '8px', height: '8px', borderRadius: '1px', background: c }} />
        ))}
        <span>多</span>
      </div>
    </div>
  )
}

function AIStatsSection() {
  const aiMessages = useAICollabStore((s) => s.messages)

  const stats = useMemo(() => {
    const userMsgs = aiMessages.filter((m) => m.role === 'user')
    const aiMsgs = aiMessages.filter((m) => m.role === 'assistant')
    const totalUserChars = userMsgs.reduce((sum, m) => sum + m.content.length, 0)
    const totalAiChars = aiMsgs.reduce((sum, m) => sum + m.content.length, 0)
    const totalTokens = aiMessages.reduce((sum, m) => sum + (m.metadata?.tokenUsage || 0), 0)
    const totalCost = aiMessages.reduce((sum, m) => sum + (m.metadata?.cost || 0), 0)
    const aiRatio = totalUserChars + totalAiChars > 0
      ? Math.round((totalAiChars / (totalUserChars + totalAiChars)) * 100)
      : 0

    return { userMsgCount: userMsgs.length, aiMsgCount: aiMsgs.length, totalUserChars, totalAiChars, totalTokens, totalCost, aiRatio }
  }, [aiMessages])

  return (
    <div
      style={{
        padding: '16px',
        borderRadius: 'var(--app-radius-lg)',
        background: 'var(--app-surface)',
        border: '1px solid var(--app-border)',
      }}
    >
      <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--app-text-primary)', marginBottom: '12px' }}>
        AI 协作统计
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
        <StatCard label="用户消息" value={stats.userMsgCount} icon={<span>👤</span>} />
        <StatCard label="AI 回复" value={stats.aiMsgCount} icon={<Zap size={12} />} accent="var(--color-brand)" />
        <StatCard label="Token 消耗" value={stats.totalTokens > 0 ? stats.totalTokens.toLocaleString() : '—'} icon={<Zap size={12} />} />
        <StatCard label="预估费用" value={stats.totalCost > 0 ? `¥${stats.totalCost.toFixed(4)}` : '—'} icon={<Coins size={12} />} />
      </div>

      {/* AI ratio bar */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', marginBottom: '4px' }}>
          <span style={{ color: 'var(--app-text-muted)' }}>AI 生成占比</span>
          <span style={{ fontWeight: 700, color: stats.aiRatio > 60 ? 'var(--color-warning)' : 'var(--app-text-primary)' }}>
            {stats.aiRatio}%
          </span>
        </div>
        <div style={{ height: '6px', borderRadius: '3px', background: 'var(--app-surface-subtle)', overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              width: `${stats.aiRatio}%`,
              borderRadius: '3px',
              background: stats.aiRatio > 60 ? 'var(--color-warning)' : 'var(--color-brand)',
              transition: 'width 0.3s ease',
            }}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', marginTop: '3px', color: 'var(--app-text-muted)' }}>
          <span>用户 {stats.totalUserChars.toLocaleString()} 字</span>
          <span>AI {stats.totalAiChars.toLocaleString()} 字</span>
        </div>
      </div>

      {aiMessages.length === 0 && (
        <div style={{ fontSize: '11px', color: 'var(--app-text-muted)', textAlign: 'center', padding: '8px' }}>
          开始 AI 协作后，统计数据将在此显示
        </div>
      )}
    </div>
  )
}

export function AnalyticsPage() {
  const { selectedBookId } = useBookshelfStore()
  const bookId = selectedBookId
  const { summary, modelUsage, computeFromChapters } = useAnalyticsStore()
  const [duplicates, setDuplicates] = useState<DuplicateResult[]>([])
  const [topIssues, setTopIssues] = useState<Array<{ dimension: string; count: number; category: string }>>([])
  const [chapters, setChapters] = useState<Array<{ title: string; content: string; created_at?: number | string; updated_at?: number | string }>>([])

  useEffect(() => {
    if (!bookId) return
    listChapters(bookId).then((chaps) => {
      computeFromChapters(chaps)
      setChapters(chaps)
      const dupes = runAllDetections(
        chaps.map((c) => ({ id: c.id, title: c.title, content: c.content })),
      )
      setDuplicates(dupes)
      const scoredChaps = chaps
        .filter((c) => c.ai_audit_score !== null && c.ai_audit_score !== undefined)
        .map((c) => ({
          dimension: c.title,
          count: Math.max(0, 100 - (c.ai_audit_score || 0)),
          category: 'score',
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
      setTopIssues(scoredChaps)
    })
  }, [bookId, computeFromChapters])

  if (!bookId) {
    return (
      <EmptyState
        icon={<BarChart3 size={28} />}
        title="暂无数据"
        description="请从书架选择一本书查看数据分析"
      />
    )
  }

  const wordTrend = summary?.wordCountTrend || []
  const auditTrend = summary?.auditTrend || []
  const maxWordCount = Math.max(...wordTrend.map((d) => d.count), 1)

  return (
    <div style={{ padding: '24px', maxWidth: '960px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--app-text-primary)', marginBottom: '20px' }}>
        数据分析
      </h1>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
        <StatCard label="总字数" value={summary?.totalWords?.toLocaleString() || '0'} icon={<TrendingUp size={12} />} accent="var(--color-brand)" />
        <StatCard label="总章数" value={summary?.totalChapters || 0} />
        <StatCard label="平均章字数" value={summary?.avgWordsPerChapter?.toLocaleString() || '0'} />
        <StatCard label="重复问题" value={duplicates.length} accent={duplicates.length > 0 ? 'var(--color-warning)' : undefined} />
      </div>

      {/* Writing Heatmap */}
      <div
        style={{
          padding: '16px',
          borderRadius: 'var(--app-radius-lg)',
          background: 'var(--app-surface)',
          border: '1px solid var(--app-border)',
          marginBottom: '16px',
        }}
      >
        <WritingHeatmap chapters={chapters} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
        {/* Word Count Trend */}
        <div
          style={{
            padding: '16px',
            borderRadius: 'var(--app-radius-lg)',
            background: 'var(--app-surface)',
            border: '1px solid var(--app-border)',
          }}
        >
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--app-text-primary)', marginBottom: '12px' }}>
            字数趋势
          </div>
          {wordTrend.length > 0 ? (
            <BarChart
              data={wordTrend.map((d) => ({ label: d.date, value: d.count }))}
              maxValue={maxWordCount}
            />
          ) : (
            <div style={{ fontSize: '11px', color: 'var(--app-text-muted)', textAlign: 'center', padding: '20px' }}>
              开始写作后显示
            </div>
          )}
        </div>

        {/* Audit Trend */}
        <div
          style={{
            padding: '16px',
            borderRadius: 'var(--app-radius-lg)',
            background: 'var(--app-surface)',
            border: '1px solid var(--app-border)',
          }}
        >
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--app-text-primary)', marginBottom: '12px' }}>
            审计评分趋势
          </div>
          {auditTrend.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {auditTrend.slice(-10).map((d, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px' }}>
                  <span style={{ width: '40px', flexShrink: 0, color: 'var(--app-text-muted)' }}>{d.date.slice(5)}</span>
                  <div style={{ flex: 1, height: '6px', borderRadius: '3px', background: 'var(--app-surface-subtle)' }}>
                    <div
                      style={{
                        height: '100%',
                        borderRadius: '3px',
                        width: `${d.score}%`,
                        background: d.score >= 80 ? 'var(--color-success)' : d.score >= 60 ? 'var(--color-warning)' : 'var(--color-danger)',
                      }}
                    />
                  </div>
                  <span style={{ width: '24px', textAlign: 'right', color: 'var(--app-text-primary)', fontWeight: 600 }}>{d.score}</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: '11px', color: 'var(--app-text-muted)', textAlign: 'center', padding: '20px' }}>
              审计后显示
            </div>
          )}
        </div>
      </div>

      {/* AI Stats */}
      <div style={{ marginBottom: '16px' }}>
        <AIStatsSection />
      </div>

      {/* Model Usage */}
      {Object.keys(modelUsage).length > 0 && (
        <div
          style={{
            padding: '16px',
            borderRadius: 'var(--app-radius-lg)',
            background: 'var(--app-surface)',
            border: '1px solid var(--app-border)',
            marginBottom: '16px',
          }}
        >
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--app-text-primary)', marginBottom: '12px' }}>
            AI 模型使用分布
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {Object.entries(modelUsage)
              .sort((a, b) => b[1] - a[1])
              .map(([model, count]) => (
                <div key={model} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px' }}>
                  <span style={{ width: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--app-text-primary)' }}>{model}</span>
                  <div style={{ flex: 1, height: '6px', borderRadius: '3px', background: 'var(--app-surface-subtle)' }}>
                    <div
                      style={{
                        height: '100%',
                        borderRadius: '3px',
                        width: `${(count / Math.max(...Object.values(modelUsage))) * 100}%`,
                        background: 'var(--color-info)',
                      }}
                    />
                  </div>
                  <span style={{ width: '24px', textAlign: 'right', color: 'var(--app-text-muted)' }}>{count}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Duplicates */}
      {duplicates.length > 0 && (
        <div
          style={{
            padding: '16px',
            borderRadius: 'var(--app-radius-lg)',
            background: 'var(--app-surface)',
            border: '1px solid var(--app-border)',
            marginBottom: '16px',
          }}
        >
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--app-text-primary)', marginBottom: '12px' }}>
            跨章重复检测 ({duplicates.length} 个问题)
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '240px', overflowY: 'auto' }}>
            {duplicates.slice(0, 15).map((dup, i) => (
              <div
                key={i}
                style={{
                  padding: '8px',
                  borderRadius: 'var(--app-radius-md)',
                  background: 'var(--app-surface-subtle)',
                  fontSize: '11px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  <span
                    style={{
                      padding: '1px 6px',
                      borderRadius: 'var(--app-radius-full)',
                      fontSize: '9px',
                      fontWeight: 700,
                      background: dup.type === 'paragraph' ? 'var(--color-danger-light)' : 'var(--color-warning-light)',
                      color: dup.type === 'paragraph' ? 'var(--color-danger)' : 'var(--color-warning)',
                    }}
                  >
                    {dup.type === 'paragraph' ? '重复段落' : dup.type === 'title' ? '标题相似' : dup.type === 'opening' ? '开篇雷同' : dup.type === 'closing' ? '结尾雷同' : '结构相似'}
                  </span>
                  <span style={{ color: 'var(--app-text-muted)' }}>
                    {dup.chapterATitle} ↔ {dup.chapterBTitle}
                  </span>
                  <span style={{ color: 'var(--app-text-primary)', fontWeight: 600 }}>{Math.round(dup.similarity * 100)}%</span>
                </div>
                <div style={{ color: 'var(--app-text-muted)', fontSize: '10px' }}>
                  {dup.textA.slice(0, 80)}...
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Issues */}
      {topIssues.length > 0 && (
        <div
          style={{
            padding: '16px',
            borderRadius: 'var(--app-radius-lg)',
            background: 'var(--app-surface)',
            border: '1px solid var(--app-border)',
          }}
        >
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--app-text-primary)', marginBottom: '12px' }}>
            高频问题统计
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {topIssues.map((issue, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px' }}>
                <span style={{ width: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--app-text-primary)' }}>{issue.dimension}</span>
                <div style={{ flex: 1, height: '6px', borderRadius: '3px', background: 'var(--app-surface-subtle)' }}>
                  <div
                    style={{
                      height: '100%',
                      borderRadius: '3px',
                      width: `${(issue.count / Math.max(...topIssues.map((t) => t.count))) * 100}%`,
                      background: 'var(--color-danger)',
                    }}
                  />
                </div>
                <span style={{ width: '24px', textAlign: 'right', color: 'var(--app-text-muted)' }}>{issue.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {wordTrend.length === 0 && auditTrend.length === 0 && duplicates.length === 0 && (
        <div
          style={{
            padding: '48px',
            borderRadius: 'var(--app-radius-lg)',
            background: 'var(--app-surface-subtle)',
            textAlign: 'center',
            fontSize: '12px',
            color: 'var(--app-text-muted)',
          }}
        >
          开始写作后，数据分析将在此显示
        </div>
      )}
    </div>
  )
}
