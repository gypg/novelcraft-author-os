import { isTauri } from '@/shared/utils/tauri-env'
import type { AuthorProfileRow, CreateAuthorProfileInput, UpdateAuthorProfileInput } from '@/core/author-os/author-profile-types'

let _invoke: typeof import('@tauri-apps/api/core').invoke | null = null
let mockProfiles: AuthorProfileRow[] = []

async function getInvoke() {
  if (!isTauri()) return null
  if (!_invoke) {
    try {
      const mod = await import('@tauri-apps/api/core')
      _invoke = mod.invoke
    } catch {
      return null
    }
  }
  return _invoke
}

function now(): number {
  return Date.now()
}

function cloneProfile(profile: AuthorProfileRow): AuthorProfileRow {
  return { ...profile }
}

function definedEntries<T extends object>(input: T): Partial<T> {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) as Partial<T>
}

function withDefaults(input: CreateAuthorProfileInput, timestamp: number): AuthorProfileRow {
  return {
    id: input.id,
    name: input.name.trim(),
    preferred_genres: input.preferred_genres ?? '[]',
    writing_style: input.writing_style ?? '',
    common_phrases: input.common_phrases ?? '[]',
    favorite_themes: input.favorite_themes ?? '[]',
    forbidden_words: input.forbidden_words ?? '[]',
    pov_preference: input.pov_preference ?? '',
    pace_preference: input.pace_preference ?? '',
    notes: input.notes ?? '',
    created_at: timestamp,
    updated_at: timestamp,
  }
}

function toUpdateInvokeInput(input: UpdateAuthorProfileInput) {
  return {
    name: input.name,
    preferredGenres: input.preferred_genres,
    writingStyle: input.writing_style,
    commonPhrases: input.common_phrases,
    favoriteThemes: input.favorite_themes,
    forbiddenWords: input.forbidden_words,
    povPreference: input.pov_preference,
    pacePreference: input.pace_preference,
    notes: input.notes,
  }
}

export function __resetAuthorProfileRepositoryForTests(): void {
  mockProfiles = []
}

export async function createAuthorProfile(input: CreateAuthorProfileInput): Promise<AuthorProfileRow> {
  const inv = await getInvoke()
  if (inv) return inv<AuthorProfileRow>('create_author_profile', { input })

  if (mockProfiles.some((profile) => profile.id === input.id)) throw new Error('Author profile already exists')
  const profile = withDefaults(input, now())
  mockProfiles = [...mockProfiles, profile]
  return cloneProfile(profile)
}

export async function listAuthorProfiles(): Promise<AuthorProfileRow[]> {
  const inv = await getInvoke()
  if (inv) return inv<AuthorProfileRow[]>('list_author_profiles')

  return mockProfiles
    .map(cloneProfile)
    .sort((a, b) => b.updated_at - a.updated_at || b.created_at - a.created_at || b.id.localeCompare(a.id))
}

export async function updateAuthorProfile(id: string, input: UpdateAuthorProfileInput): Promise<AuthorProfileRow> {
  const inv = await getInvoke()
  if (inv) return inv<AuthorProfileRow>('update_author_profile', { id, input: toUpdateInvokeInput(input) })

  const existing = mockProfiles.find((profile) => profile.id === id)
  if (!existing) throw new Error('Author profile not found')
  const updated: AuthorProfileRow = {
    ...existing,
    ...definedEntries(input),
    name: input.name !== undefined ? input.name.trim() : existing.name,
    updated_at: now(),
  }
  mockProfiles = mockProfiles.map((profile) => profile.id === id ? updated : profile)
  return cloneProfile(updated)
}

export async function getDefaultAuthorProfile(): Promise<AuthorProfileRow | null> {
  const inv = await getInvoke()
  if (inv) return inv<AuthorProfileRow | null>('get_default_author_profile')

  return (await listAuthorProfiles())[0] ?? null
}
