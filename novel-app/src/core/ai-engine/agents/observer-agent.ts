import type { ChatMessage } from '../providers'
import { BaseAgent } from './base-agent'
import { stripHtml } from '../context-builder'
import type { AgentContext, FactDelta } from './types'

export class ObserverAgent extends BaseAgent {
  readonly role = 'observer' as const
  readonly name = '观察 Agent'

  buildSystemPrompt(_context: AgentContext): string {
    return [
      '你是一个专业的小说事实观察员。请从章节正文中提取结构化的事实变化。',
      '',
      '## 输出要求',
      '请严格按照以下 JSON 格式输出，不要添加任何其他文字：',
      '',
      '```json',
      '{',
      '  "upserts": [',
      '    {',
      '      "subject": "角色名或实体名",',
      '      "predicate": "关系或状态谓语",',
      '      "object": "对象或状态值",',
      '      "valid_from_chapter": 1',
      '    }',
      '  ],',
      '  "invalidations": [',
      '    {',
      '      "subject": "角色名",',
      '      "predicate": "之前成立但现在不再成立的关系",',
      '      "chapterId": "当前章节ID（留空即可）"',
      '    }',
      '  ]',
      '}',
      '```',
      '',
      '## 提取原则',
      '- 只提取明确陈述的事实，不要推测',
      '- upserts: 新出现的角色关系、状态变化、物品转移、位置移动',
      '- invalidations: 之前成立但现在被明确推翻的事实（如角色死亡、关系破裂）',
      '- valid_from_chapter: 使用当前章节号（如传入了 chapterNumber）',
      '- 每个 fact 应该是一个独立的、可查询的三元组',
      '- 如果没有明显的新事实，返回空数组',
    ].join('\n')
  }

  buildMessages(context: AgentContext, systemPrompt: string): ChatMessage[] {
    const parts: string[] = []

    const chapterNum = context.chapterNumber ?? 1

    parts.push(`## 当前章节号：${chapterNum}`)
    parts.push('')

    // Current content
    const text = stripHtml(context.chapterContent)
    parts.push('## 章节正文')
    parts.push(text)
    parts.push('')

    // Truth files snapshot for context
    if (context.truthFilesJson) {
      parts.push('## 当前已知的事实（用于对比新增/失效）')
      for (const [name, json] of Object.entries(context.truthFilesJson)) {
        parts.push(`### ${name}`)
        parts.push(json.slice(0, 1000))
        parts.push('')
      }
    }

    parts.push('请从正文中提取事实变化。')

    return [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: parts.join('\n') },
    ]
  }

  parseOutput(raw: string): FactDelta {
    let jsonStr = raw

    const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (fenceMatch) {
      jsonStr = fenceMatch[1]
    }

    const jsonStart = jsonStr.indexOf('{')
    const jsonEnd = jsonStr.lastIndexOf('}')
    if (jsonStart !== -1 && jsonEnd !== -1) {
      jsonStr = jsonStr.slice(jsonStart, jsonEnd + 1)
    }

    jsonStr = jsonStr.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']')

    try {
      const parsed = JSON.parse(jsonStr)
      return {
        upserts: Array.isArray(parsed.upserts)
          ? parsed.upserts.map((u: Record<string, unknown>) => ({
              subject: String(u.subject || ''),
              predicate: String(u.predicate || ''),
              object: String(u.object || ''),
              valid_from_chapter: typeof u.valid_from_chapter === 'number' ? u.valid_from_chapter : 1,
              valid_until_chapter: u.valid_until_chapter as number | null ?? null,
            }))
          : [],
        invalidations: Array.isArray(parsed.invalidations)
          ? parsed.invalidations.map((i: Record<string, unknown>) => ({
              subject: String(i.subject || ''),
              predicate: String(i.predicate || ''),
              chapterId: String(i.chapterId || ''),
            }))
          : [],
      }
    } catch {
      return { upserts: [], invalidations: [] }
    }
  }
}
