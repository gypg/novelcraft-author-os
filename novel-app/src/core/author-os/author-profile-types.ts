export interface AuthorProfileRow {
  id: string
  name: string
  preferred_genres: string
  writing_style: string
  common_phrases: string
  favorite_themes: string
  forbidden_words: string
  pov_preference: string
  pace_preference: string
  notes: string
  created_at: number
  updated_at: number
}

export interface CreateAuthorProfileInput {
  id: string
  name: string
  preferred_genres?: string
  writing_style?: string
  common_phrases?: string
  favorite_themes?: string
  forbidden_words?: string
  pov_preference?: string
  pace_preference?: string
  notes?: string
}

export type UpdateAuthorProfileInput = Partial<Omit<CreateAuthorProfileInput, 'id'>>
