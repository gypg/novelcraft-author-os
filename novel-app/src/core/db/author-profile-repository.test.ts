import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  __resetAuthorProfileRepositoryForTests,
  createAuthorProfile,
  getDefaultAuthorProfile,
  listAuthorProfiles,
  updateAuthorProfile,
} from './author-profile-repository'

describe('author profile repository browser fallback', () => {
  beforeEach(() => {
    __resetAuthorProfileRepositoryForTests()
    vi.useFakeTimers()
    vi.setSystemTime(1_000)
  })

  it('returns null default when no profile exists', async () => {
    expect(await listAuthorProfiles()).toEqual([])
    expect(await getDefaultAuthorProfile()).toBeNull()
  })

  it('creates and lists defensive copies', async () => {
    const input = Object.freeze({
      id: 'profile-1',
      name: '山海',
      preferred_genres: '["玄幻"]',
      writing_style: '短句。',
      common_phrases: '["没人知道"]',
      favorite_themes: '["成长"]',
      forbidden_words: '["竟然"]',
      pov_preference: '第三人称限知',
      pace_preference: '波浪式',
      notes: '备注',
    })

    const created = await createAuthorProfile(input)
    const listed = await listAuthorProfiles()
    listed[0].name = 'mutated outside repository'

    expect(created.name).toBe('山海')
    expect((await listAuthorProfiles())[0].name).toBe('山海')
  })

  it('updates profiles immutably and keeps explicit empty strings', async () => {
    await createAuthorProfile({ id: 'profile-1', name: '旧名' })
    const before = (await listAuthorProfiles())[0]
    vi.setSystemTime(2_000)

    const updated = await updateAuthorProfile('profile-1', {
      name: '新名',
      writing_style: '',
      forbidden_words: '["不禁"]',
    })

    expect(before.name).toBe('旧名')
    expect(updated.name).toBe('新名')
    expect(updated.writing_style).toBe('')
    expect(updated.forbidden_words).toBe('["不禁"]')
  })

  it('uses latest updated profile as default', async () => {
    await createAuthorProfile({ id: 'profile-1', name: '早期风格' })
    vi.setSystemTime(2_000)
    await createAuthorProfile({ id: 'profile-2', name: '近期风格' })
    vi.setSystemTime(3_000)
    await updateAuthorProfile('profile-1', { notes: '刚更新' })

    expect((await getDefaultAuthorProfile())?.id).toBe('profile-1')
  })

  it('throws a clear error when updating a missing profile', async () => {
    await expect(updateAuthorProfile('missing', { name: '新名' })).rejects.toThrow('Author profile not found')
  })
})
