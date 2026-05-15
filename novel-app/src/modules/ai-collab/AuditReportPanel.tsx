import { useState } from 'react'
import { useAuditStore } from './audit-store'
import type { AuditReport, AuditDimension, AuditIssue } from '@/core/ai-engine/agents'

function getScoreColor(score: number): string {
  if (score >= 80) return 'oklch(0.65 0.17 145)'
  if (score >= 60) return 'oklch(0.75 0.15 80)'
  return 'oklch(0.6 0.22 25)'
}

function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'critical': return 'oklch(0.6 0.22 25)'
    case 'warning': return 'oklch(0.75 0.15 80)'
    case 'info': return 'oklch(0.6 0.12 250)'
    default: return 'var(--muted-foreground)'
  }
}

function getSeverityLabel(severity: string): string {
  switch (severity) {
    case 'critical': return '严重'
    case 'warning': return '警告'
    case 'info': return '提示'
    case 'pass': return '通过'
    default: return severity
  }
}

function ScoreHeader({ report }: { report: AuditReport }) {
  const color = getScoreColor(report.overallScore)
  const barWidth = Math.max(0, Math.min(100, report.overallScore))

  return (
    <div className="p-3 border-b" style={{ borderColor: 'var(--border)' }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium" style={{ color: 'var(--foreground)' }}>
          审计评分
        </span>
        <span className="text-lg font-bold" style={{ color }}>
          {report.overallScore}
        </span>
      </div>
      <div
        className="h-2 rounded-full overflow-hidden"
        style={{ backgroundColor: 'var(--muted)' }}
      >
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${barWidth}%`, backgroundColor: color }}
        />
      </div>
      <div className="flex gap-3 mt-2 text-[11px]">
        {report.criticalCount > 0 && (
          <span style={{ color: getSeverityColor('critical') }}>
            {report.criticalCount} 严重
          </span>
        )}
        {report.warningCount > 0 && (
          <span style={{ color: getSeverityColor('warning') }}>
            {report.warningCount} 警告
          </span>
        )}
        {report.infoCount > 0 && (
          <span style={{ color: getSeverityColor('info') }}>
            {report.infoCount} 提示
          </span>
        )}
      </div>
    </div>
  )
}

function DimensionCard({ dimension }: { dimension: AuditDimension }) {
  const [expanded, setExpanded] = useState(dimension.issues.length > 0)

  const hasIssues = dimension.issues.length > 0
  const severityColor = getSeverityColor(dimension.severity)

  return (
    <div
      className="border-b"
      style={{ borderColor: 'var(--border)' }}
    >
      <button
        className="w-full flex items-center justify-between px-3 py-2 text-xs"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <span style={{ color: 'var(--foreground)', fontWeight: 500 }}>
            {dimension.name}
          </span>
          {hasIssues && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded"
              style={{
                backgroundColor: `${severityColor}20`,
                color: severityColor,
              }}
            >
              {dimension.issues.length}
            </span>
          )}
        </div>
        <span
          className="text-[10px]"
          style={{ color: dimension.severity === 'pass' ? 'oklch(0.65 0.17 145)' : severityColor }}
        >
          {dimension.severity === 'pass' ? '通过' : getSeverityLabel(dimension.severity)}
        </span>
      </button>

      {expanded && hasIssues && (
        <div className="px-3 pb-2 space-y-1">
          {dimension.issues.map((issue, i) => (
            <IssueItem key={i} issue={issue} />
          ))}
        </div>
      )}
    </div>
  )
}

function IssueItem({ issue }: { issue: AuditIssue }) {
  const color = getSeverityColor(issue.severity)

  return (
    <div
      className="rounded p-2 text-[11px]"
      style={{ backgroundColor: 'var(--muted)' }}
    >
      <div className="flex items-start gap-2">
        <span
          className="text-[9px] px-1 py-0.5 rounded shrink-0 mt-0.5"
          style={{ backgroundColor: `${color}20`, color }}
        >
          {getSeverityLabel(issue.severity)}
        </span>
        <div className="flex-1">
          <div style={{ color: 'var(--foreground)' }}>{issue.description}</div>
          {issue.suggestion && (
            <div className="mt-1" style={{ color: 'var(--muted-foreground)' }}>
              建议：{issue.suggestion}
            </div>
          )}
          {issue.location && (
            <div className="mt-0.5 text-[10px]" style={{ color: 'var(--muted-foreground)' }}>
              位置：第{issue.location.chapter}章
              {issue.location.paragraph ? ` 第${issue.location.paragraph}段` : ''}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function AuditReportPanel() {
  const { currentReport, pipelineStatus, currentIteration } = useAuditStore()

  if (!currentReport) {
    return (
      <div className="p-4">
        <div
          className="rounded-md p-6 text-center text-xs"
          style={{ backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)' }}
        >
          {pipelineStatus === 'running'
            ? `审计进行中（第 ${currentIteration} 轮）...`
            : 'AI 审稿报告将在此显示'}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <ScoreHeader report={currentReport} />

      <div className="flex-1 overflow-y-auto">
        {currentReport.dimensions.map((dim) => (
          <DimensionCard key={dim.id} dimension={dim} />
        ))}
      </div>
    </div>
  )
}
