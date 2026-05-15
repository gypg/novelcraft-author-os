import type { TensionScore } from '@/core/analytics/tension-tracker'

interface TensionChartProps {
  scores: TensionScore[]
}

function getScoreColor(score: number): string {
  if (score >= 7) return 'oklch(0.65 0.17 145)'
  if (score >= 4) return 'oklch(0.75 0.15 80)'
  return 'oklch(0.6 0.22 25)'
}

export function TensionChart({ scores }: TensionChartProps) {
  if (scores.length === 0) {
    return (
      <div className="text-xs text-center py-4" style={{ color: 'var(--muted-foreground)' }}>
        暂无张力数据
      </div>
    )
  }

  const maxScore = 10

  return (
    <div className="space-y-1">
      {/* Y-axis labels */}
      <div className="flex items-end gap-1 h-24">
        {scores.map((s, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
            <span className="text-[8px]" style={{ color: 'var(--muted-foreground)' }}>
              {s.score}
            </span>
            <div
              className="w-full rounded-t transition-all"
              style={{
                height: `${(s.score / maxScore) * 100}%`,
                backgroundColor: getScoreColor(s.score),
                minHeight: '2px',
              }}
            />
            <span className="text-[8px] truncate w-full text-center" style={{ color: 'var(--muted-foreground)' }}>
              Ch.{s.chapterNumber}
            </span>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex gap-3 text-[9px] mt-2" style={{ color: 'var(--muted-foreground)' }}>
        <span><span style={{ color: 'oklch(0.65 0.17 145)' }}>■</span> 高张力 (7-10)</span>
        <span><span style={{ color: 'oklch(0.75 0.15 80)' }}>■</span> 中张力 (4-6)</span>
        <span><span style={{ color: 'oklch(0.6 0.22 25)' }}>■</span> 低张力 (0-3)</span>
      </div>
    </div>
  )
}
