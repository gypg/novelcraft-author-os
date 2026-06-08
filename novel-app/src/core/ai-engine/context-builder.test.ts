import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AuthorProfileRow } from '@/core/author-os/author-profile-types'

vi.mock('@/core/db/repository', () => ({
  listChapters: vi.fn(() => Promise.resolve([])),
}))

vi.mock('@/core/db/temporal-memory-repository', () => ({
  queryTemporalFactsAtChapter: vi.fn(() => Promise.resolve([])),
}))

vi.mock('@/core/db/truth-file-repository', () => ({
  loadTruthFile: vi.fn(() => Promise.resolve(null)),
}))

const getDefaultAuthorProfileMock = vi.fn()
vi.mock('@/core/db/author-profile-repository', () => ({
  getDefaultAuthorProfile: () => getDefaultAuthorProfileMock(),
}))

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

describe('buildWritingContext author profile integration', () => {
  beforeEach(() => {
    getDefaultAuthorProfileMock.mockReset()
  })

  it('injects default author profile constraints into the system prompt', async () => {
    getDefaultAuthorProfileMock.mockResolvedValue(profile)
    const { buildWritingContext } = await import('./context-builder')

    const result = await buildWritingContext({
      bookId: 'book-1',
      chapterId: 'chapter-1',
      currentContent: '<p>已有内容</p>',
    })

    expect(result.context.systemPrompt).toContain('## 作者显式风格约束')
    expect(result.context.systemPrompt).toContain('笔名："山海"')
    expect(result.context.systemPrompt).toContain('## 作者个人禁用/高频回避表达')
    expect(result.context.systemPrompt).toContain('["竟然","没人知道"]')
  })

  it('continues without throwing when no default profile exists', async () => {
    getDefaultAuthorProfileMock.mockResolvedValue(null)
    const { buildWritingContext } = await import('./context-builder')

    const result = await buildWritingContext({
      bookId: 'book-1',
      chapterId: 'chapter-1',
      currentContent: '',
    })

    expect(result.context.systemPrompt).toContain('## 写作禁忌（必须遵守）')
    expect(result.context.systemPrompt).not.toContain('## 作者显式风格约束')
  })

  it('continues without throwing when profile loading fails', async () => {
    getDefaultAuthorProfileMock.mockRejectedValue(new Error('repository unavailable'))
    const { buildWritingContext } = await import('./context-builder')

    const result = await buildWritingContext({
      bookId: 'book-1',
      chapterId: 'chapter-1',
      currentContent: '',
    })

    expect(result.context.systemPrompt).toContain('## 写作禁忌（必须遵守）')
  })
})
