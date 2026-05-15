import { useMemo } from 'react'
import { buildTimelineFromFacts, detectTimelineContradictions, type TimelineEvent } from '@/core/timeline/timeline-engine'
import type { TemporalFactRow } from '@/core/db/temporal-memory-repository'

interface TimelinePanelProps {
  facts: TemporalFactRow[]
  onNavigateToChapter?: (chapterNumber: number) => void
}

export function TimelinePanel({ facts, onNavigateToChapter }: TimelinePanelProps) {
  const events = useMemo(() => buildTimelineFromFacts(facts), [facts])
  const contradictions = useMemo(() => detectTimelineContradictions(events), [events])

  if (events.length === 0) {
    return (
      <div className="p-4 text-center text-xs" style={{ color: 'var(--muted-foreground)' }}>
        暂无时间线数据
      </div>
    )
  }

  // Group by chapter
  const grouped = new Map<number, TimelineEvent[]>()
  for (const evt of events) {
    const ch = evt.chapterNumber
    if (!grouped.has(ch)) grouped.set(ch, [])
    grouped.get(ch)!.push(evt)
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Contradictions warning */}
      {contradictions.length > 0 && (
        <div className="mx-2 mt-2 p-2 rounded text-[11px]" style={{ backgroundColor: 'oklch(0.7 0.18 25 / 0.1)', color: 'oklch(0.5 0.18 25)' }}>
          ⚠ {contradictions.length} 个时间线矛盾
        </div>
      )}

      {/* Timeline */}
      <div className="relative px-4 py-3">
        {/* Vertical line */}
        <div
          className="absolute left-6 top-0 bottom-0 w-px"
          style={{ backgroundColor: 'var(--border)' }}
        />

        {Array.from(grouped.entries()).map(([chapter, chapterEvents]) => (
          <div key={chapter} className="relative mb-4">
            {/* Chapter node */}
            <div className="flex items-center gap-2 mb-1">
              <div
                className="w-3 h-3 rounded-full border-2 shrink-0 z-10"
                style={{
                  borderColor: 'oklch(0.65 0.17 145)',
                  backgroundColor: 'var(--background)',
                }}
              />
              <button
                className="text-[11px] font-medium cursor-pointer hover:underline"
                style={{ color: 'var(--foreground)' }}
                onClick={() => onNavigateToChapter?.(chapter)}
              >
                第 {chapter} 章
              </button>
            </div>

            {/* Events */}
            <div className="ml-6 space-y-1">
              {chapterEvents.map((evt) => (
                <div
                  key={evt.id}
                  className="text-[11px] rounded px-2 py-1"
                  style={{
                    backgroundColor: evt.importance === 'major' ? 'oklch(0.95 0.01 80)' : 'var(--muted)',
                    color: 'var(--muted-foreground)',
                  }}
                >
                  <span className="font-medium" style={{ color: 'var(--foreground)' }}>
                    {evt.title}
                  </span>
                  {evt.description && (
                    <span className="ml-1">— {evt.description.slice(0, 60)}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
