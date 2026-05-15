import type { ChatMessage } from '../providers'
import { BaseAgent } from './base-agent'
import { stripHtml } from '../context-builder'
import { AUDIT_DIMENSIONS, type AuditReport, type AuditDimension, type AuditIssue } from './audit-types'
import type { AgentContext } from './types'

export class AuditorAgent extends BaseAgent {
  readonly role = 'auditor' as const
  readonly name = '审计 Agent'

  buildSystemPrompt(_context: AgentContext): string {
    const dimensionList = AUDIT_DIMENSIONS
      .map((d) => `  - ${d.id}: ${d.name}（类别: ${d.category}）`)
      .join('\n')

    return [
      '你是一个专业的小说质量审计员。请对给定的小说章节进行质量审计。',
      '',
      '## 审计维度',
      dimensionList,
      '',
      '## 输出要求',
      '请严格按照以下 JSON 格式输出审计报告，不要添加任何其他文字：',
      '',
      '```json',
      '{',
      '  "overallScore": 82,',
      '  "dimensions": [',
      '    {',
      '      "id": "writing-style",',
      '      "name": "写作风格一致性",',
      '      "category": "prose",',
      '      "severity": "warning",',
      '      "issues": [',
      '        {',
      '          "severity": "warning",',
      '          "location": { "chapter": 1, "paragraph": 3 },',
      '          "description": "段落间风格不一致",',
      '          "suggestion": "建议统一叙事视角"',
      '        }',
      '      ]',
      '    }',
      '  ],',
      '  "criticalCount": 0,',
      '  "warningCount": 2,',
      '  "infoCount": 1',
      '}',
      '```',
      '',
      '## 评分标准',
      '- overallScore: 0-100 分，80+ 为优秀，60-80 为合格，<60 为需改进',
      '- severity: critical（必须修复）/ warning（建议修复）/ info（仅供参考）',
      '- 每个维度必须评估，即使没有问题也要返回（issues 为空数组）',
      '- critical 级别问题：角色名不一致、时间线矛盾、严重 AI 痕迹',
      '- warning 级别问题：节奏平淡、对话生硬、词汇重复',
      '- info 级别问题：可优化的表达、微小的不一致',
    ].join('\n')
  }

  buildMessages(context: AgentContext, systemPrompt: string): ChatMessage[] {
    const currentText = stripHtml(context.chapterContent)
    const parts: string[] = []

    parts.push(`## 章节标题：${context.chapterTitle || '未命名'}`)
    parts.push('')
    parts.push('## 章节内容')
    parts.push(currentText)

    if (context.previousChapters && context.previousChapters.length > 0) {
      parts.push('')
      parts.push('## 前文摘要（用于连续性检查）')
      for (const ch of context.previousChapters) {
        parts.push(`【${ch.title}】${ch.contentTail.slice(0, 300)}`)
      }
    }

    return [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: parts.join('\n') },
    ]
  }

  parseOutput(raw: string): AuditReport {
    // Extract JSON from LLM output
    let jsonStr = raw

    // Remove markdown code fences
    const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (fenceMatch) {
      jsonStr = fenceMatch[1]
    }

    // Try to find JSON object in the text
    const jsonStart = jsonStr.indexOf('{')
    const jsonEnd = jsonStr.lastIndexOf('}')
    if (jsonStart !== -1 && jsonEnd !== -1) {
      jsonStr = jsonStr.slice(jsonStart, jsonEnd + 1)
    }

    // Clean common LLM JSON issues
    jsonStr = jsonStr.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']')

    try {
      const parsed = JSON.parse(jsonStr)
      return this.validateReport(parsed)
    } catch {
      return this.emptyReport()
    }
  }

  private validateReport(parsed: Record<string, unknown>): AuditReport {
    const report: AuditReport = {
      overallScore: typeof parsed.overallScore === 'number' ? parsed.overallScore : 50,
      dimensions: [],
      criticalCount: 0,
      warningCount: 0,
      infoCount: 0,
    }

    const dimensions = parsed.dimensions
    if (Array.isArray(dimensions)) {
      for (const dim of dimensions as Record<string, unknown>[]) {
        const dimension: AuditDimension = {
          id: String(dim.id || 'unknown'),
          name: String(dim.name || dim.id || '未知维度'),
          category: String(dim.category || 'unknown'),
          severity: this.normalizeSeverity(dim.severity),
          issues: [],
        }

        const issues = dim.issues
        if (Array.isArray(issues)) {
          for (const issue of issues as Record<string, unknown>[]) {
            const auditIssue: AuditIssue = {
              severity: this.normalizeIssueSeverity(issue.severity),
              location: (issue.location as AuditIssue['location']) || { chapter: 1 },
              description: String(issue.description || ''),
              suggestion: issue.suggestion as string | undefined,
            }
            dimension.issues.push(auditIssue)

            if (auditIssue.severity === 'critical') report.criticalCount++
            else if (auditIssue.severity === 'warning') report.warningCount++
            else report.infoCount++
          }
        }

        report.dimensions.push(dimension)
      }
    }

    // Ensure all expected dimensions exist
    for (const expected of AUDIT_DIMENSIONS) {
      if (!report.dimensions.find((d) => d.id === expected.id)) {
        report.dimensions.push({
          id: expected.id,
          name: expected.name,
          category: expected.category,
          severity: 'pass',
          issues: [],
        })
      }
    }

    return report
  }

  private normalizeSeverity(s: unknown): 'critical' | 'warning' | 'info' | 'pass' {
    if (s === 'critical' || s === 'warning' || s === 'info' || s === 'pass') return s
    return 'info'
  }

  private normalizeIssueSeverity(s: unknown): 'critical' | 'warning' | 'info' {
    if (s === 'critical' || s === 'warning' || s === 'info') return s
    return 'info'
  }

  private emptyReport(): AuditReport {
    return {
      overallScore: 50,
      dimensions: AUDIT_DIMENSIONS.map((d) => ({
        id: d.id,
        name: d.name,
        category: d.category,
        severity: 'pass' as const,
        issues: [],
      })),
      criticalCount: 0,
      warningCount: 0,
      infoCount: 0,
    }
  }
}
