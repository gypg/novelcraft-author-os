import type { AuthorProfileRow, CreateAuthorProfileInput, UpdateAuthorProfileInput } from '@/core/author-os/author-profile-types'
import { parseJsonStringArray } from '@/core/author-os/author-profile-prompt'

export interface AuthorProfileDraft {
  id: string | null
  name: string
  preferredGenresText: string
  writingStyle: string
  commonPhrasesText: string
  favoriteThemesText: string
  forbiddenWordsText: string
  povPreference: string
  pacePreference: string
  notes: string
}

export function createEmptyAuthorProfileDraft(): AuthorProfileDraft {
  return {
    id: null,
    name: '',
    preferredGenresText: '',
    writingStyle: '',
    commonPhrasesText: '',
    favoriteThemesText: '',
    forbiddenWordsText: '',
    povPreference: '',
    pacePreference: '',
    notes: '',
  }
}

export function parseListText(value: string): string[] {
  return value
    .split(/[\n,，]/g)
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .filter((item, index, items) => items.indexOf(item) === index)
}

export function serializeListText(value: string): string {
  return JSON.stringify(parseListText(value))
}

function jsonArrayToText(value: string): string {
  return parseJsonStringArray(value).join('\n')
}

export function authorProfileRowToDraft(row: AuthorProfileRow): AuthorProfileDraft {
  return {
    id: row.id,
    name: row.name,
    preferredGenresText: jsonArrayToText(row.preferred_genres),
    writingStyle: row.writing_style,
    commonPhrasesText: jsonArrayToText(row.common_phrases),
    favoriteThemesText: jsonArrayToText(row.favorite_themes),
    forbiddenWordsText: jsonArrayToText(row.forbidden_words),
    povPreference: row.pov_preference,
    pacePreference: row.pace_preference,
    notes: row.notes,
  }
}

function toInputFields(draft: AuthorProfileDraft) {
  return {
    name: draft.name.trim(),
    preferred_genres: serializeListText(draft.preferredGenresText),
    writing_style: draft.writingStyle.trim(),
    common_phrases: serializeListText(draft.commonPhrasesText),
    favorite_themes: serializeListText(draft.favoriteThemesText),
    forbidden_words: serializeListText(draft.forbiddenWordsText),
    pov_preference: draft.povPreference.trim(),
    pace_preference: draft.pacePreference.trim(),
    notes: draft.notes.trim(),
  }
}

export function draftToCreateAuthorProfileInput(
  draft: AuthorProfileDraft,
  id: string,
): CreateAuthorProfileInput {
  return {
    id,
    ...toInputFields(draft),
  }
}

export function draftToUpdateAuthorProfileInput(draft: AuthorProfileDraft): UpdateAuthorProfileInput {
  return toInputFields(draft)
}
