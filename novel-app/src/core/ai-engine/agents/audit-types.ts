export interface AuditIssue {
  severity: 'critical' | 'warning' | 'info'
  location: { chapter: number; paragraph?: number; offset?: number }
  description: string
  suggestion?: string
}

export interface AuditDimension {
  id: string
  name: string
  category: string
  severity: 'critical' | 'warning' | 'info' | 'pass'
  issues: AuditIssue[]
}

// Severity type for AuditIssue (without 'pass')
export type IssueSeverity = 'critical' | 'warning' | 'info'

export interface AuditReport {
  overallScore: number
  dimensions: AuditDimension[]
  criticalCount: number
  warningCount: number
  infoCount: number
}

export interface AuditReportMeta {
  bookId: string
  chapterId: string
  timestamp: number
  agentModel: string
  iteration: number
}

export interface AuditResult {
  report: AuditReport
  meta: AuditReportMeta
}

export const AUDIT_DIMENSIONS = [
  // === 设定一致性 (8) ===
  { id: 'character-name', name: '角色名称一致性', category: 'setting' },
  { id: 'character-appearance', name: '角色外貌一致性', category: 'setting' },
  { id: 'character-ability', name: '角色能力一致性', category: 'setting' },
  { id: 'geographic-location', name: '地理位置一致性', category: 'setting' },
  { id: 'timeline', name: '时间线一致性', category: 'setting' },
  { id: 'item-state', name: '物品状态一致性', category: 'setting' },
  { id: 'rule-system', name: '规则体系一致性', category: 'setting' },
  { id: 'resource', name: '资源一致性', category: 'setting' },
  // === 叙事质量 (9) ===
  { id: 'character-arc', name: '角色弧光', category: 'narrative' },
  { id: 'supporting-characters', name: '配角功能', category: 'narrative' },
  { id: 'pacing', name: '节奏检查', category: 'narrative' },
  { id: 'scene-necessity', name: '场景必要性', category: 'narrative' },
  { id: 'conflict-density', name: '冲突密度', category: 'narrative' },
  { id: 'suspense-management', name: '悬念管理', category: 'narrative' },
  { id: 'info-feeding', name: '信息投喂', category: 'narrative' },
  { id: 'chapter-hook', name: '章节钩子', category: 'narrative' },
  { id: 'ending-satisfaction', name: '结局满足度', category: 'narrative' },
  // === 文笔质量 (7) ===
  { id: 'paragraph-length-drift', name: '段落长度漂移', category: 'prose' },
  { id: 'sentence-diversity', name: '句式多样性', category: 'prose' },
  { id: 'vocabulary-richness', name: '词汇丰富度', category: 'prose' },
  { id: 'dialogue-naturalness', name: '对话自然度', category: 'prose' },
  { id: 'description-balance', name: '描写平衡', category: 'prose' },
  { id: 'emotional-expression', name: '情感表达', category: 'prose' },
  { id: 'rhythm', name: '节奏韵律', category: 'prose' },
  // === AI 痕迹 (7) ===
  { id: 'banned-phrases', name: '禁用句式检测', category: 'ai-trace' },
  { id: 'vocabulary-fatigue', name: '词汇疲劳', category: 'ai-trace' },
  { id: 'transition-overuse', name: '过渡词过度', category: 'ai-trace' },
  { id: 'summary-tendency', name: '总结句倾向', category: 'ai-trace' },
  { id: 'list-tendency', name: '列表化倾向', category: 'ai-trace' },
  { id: 'over-explanation', name: '过度解释', category: 'ai-trace' },
  { id: 'emotion-labeling', name: '情感标签', category: 'ai-trace' },
  // === 跨章一致性 (6) ===
  { id: 'cross-chapter-duplicate', name: '跨章重复段落', category: 'cross-chapter' },
  { id: 'title-clustering', name: '标题聚集检测', category: 'cross-chapter' },
  { id: 'opening-pattern', name: '开篇模式重复', category: 'cross-chapter' },
  { id: 'closing-pattern', name: '结尾模式重复', category: 'cross-chapter' },
  { id: 'paragraph-structure-duplicate', name: '段落结构重复', category: 'cross-chapter' },
  { id: 'word-count-variation', name: '字数波动', category: 'cross-chapter' },
]
