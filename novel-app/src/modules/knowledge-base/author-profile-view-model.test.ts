import { describe, expect, it } from 'vitest'
import {
  authorProfileRowToDraft,
  createEmptyAuthorProfileDraft,
  draftToCreateAuthorProfileInput,
  draftToUpdateAuthorProfileInput,
  parseListText,
  serializeListText,
} from './author-profile-view-model'
import type { AuthorProfileRow } from '@/core/author-os/author-profile-types'

const row: AuthorProfileRow = {
  id: 'profile-1',
  name: '山海',
  preferred_genres: '["玄幻","慢热"]',
  writing_style: '短句。',
  common_phrases: '["没人知道"]',
  favorite_themes: '["成长"]',
  forbidden_words: '["竟然"]',
  pov_preference: '第三人称限知',
  pace_preference: '波浪式',
  notes: '备注',
  created_at: 1,
  updated_at: 2,
}

describe('author profile view model', () => {
  it('serializes comma and newline separated lists into JSON arrays', () => {
    expect(parseListText('玄幻，慢热\n群像,成长')).toEqual(['玄幻', '慢热', '群像', '成长'])
    expect(serializeListText('玄幻，慢热\n群像,成长')).toBe('["玄幻","慢热","群像","成长"]')
  })

  it('converts rows to editable drafts without mutating the row', () => {
    Object.freeze(row)

    const draft = authorProfileRowToDraft(row)

    expect(draft.id).toBe('profile-1')
    expect(draft.preferredGenresText).toBe('玄幻\n慢热')
    expect(draft.forbiddenWordsText).toBe('竟然')
    expect(row.name).toBe('山海')
  })

  it('creates create input from a new draft', () => {
    const draft = {
      ...createEmptyAuthorProfileDraft(),
      name: '新作者',
      preferredGenresText: '玄幻\n慢热',
      forbiddenWordsText: '竟然\n不禁',
    }

    const input = draftToCreateAuthorProfileInput(draft, 'profile-new')

    expect(input.id).toBe('profile-new')
    expect(input.name).toBe('新作者')
    expect(input.preferred_genres).toBe('["玄幻","慢热"]')
    expect(input.forbidden_words).toBe('["竟然","不禁"]')
  })

  it('creates update input from an existing draft', () => {
    const draft = { ...authorProfileRowToDraft(row), name: '新名', commonPhrasesText: '没人知道\n直到这一刻' }

    const input = draftToUpdateAuthorProfileInput(draft)

    expect(input.name).toBe('新名')
    expect(input.common_phrases).toBe('["没人知道","直到这一刻"]')
  })
})
