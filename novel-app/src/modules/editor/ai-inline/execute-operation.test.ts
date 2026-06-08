import { describe, expect, it } from 'vitest'
import { buildInlineSystemPrompt } from './execute-operation'
import type { AuthorProfileRow } from '@/core/author-os/author-profile-types'

const profile: AuthorProfileRow = {
  id: 'profile-1',
  name: '山海',
  preferred_genres: '["玄幻"]',
  writing_style: '短句为主。',
  common_phrases: '["没人知道"]',
  favorite_themes: '["成长"]',
  forbidden_words: '["竟然"]',
  pov_preference: '第三人称限知',
  pace_preference: '波浪式',
  notes: '减少解释。',
  created_at: 1,
  updated_at: 1,
}

describe('AI inline author profile prompt integration', () => {
  it('injects explicit author profile and author anti-AI rules into inline operations', () => {
    const prompt = buildInlineSystemPrompt('请润色以下文字。', profile)

    expect(prompt).toContain('## 作者显式风格约束')
    expect(prompt).toContain('笔名："山海"')
    expect(prompt).toContain('## 作者个人禁用/高频回避表达')
    expect(prompt).toContain('["竟然","没人知道"]')
    expect(prompt).toContain('请润色以下文字。')
  })

  it('keeps inline operations working without a profile', () => {
    const prompt = buildInlineSystemPrompt('请改写以下文字。', null)

    expect(prompt).toContain('## 写作禁忌（必须遵守）')
    expect(prompt).not.toContain('## 作者显式风格约束')
    expect(prompt).toContain('请改写以下文字。')
  })
})
