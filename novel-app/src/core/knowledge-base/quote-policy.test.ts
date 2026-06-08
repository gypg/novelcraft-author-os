import { describe, expect, it } from 'vitest'
import {
  canInsertDirectly,
  deriveQuotePolicyForSource,
  getAllowedSuggestionActions,
} from './quote-policy'

const sourceExpectations = [
  ['public_domain', 'direct_allowed'],
  ['user_original', 'direct_allowed'],
  ['copyrighted', 'paraphrase_recommended'],
  ['unknown', 'paraphrase_recommended'],
] as const

describe('quote policy helpers', () => {
  it.each(sourceExpectations)('derives %s source as %s', (sourceType, expected) => {
    expect(deriveQuotePolicyForSource(sourceType)).toBe(expected)
  })

  it('allows direct insertion only for direct_allowed quote policy', () => {
    expect(canInsertDirectly('direct_allowed')).toBe(true)
    expect(canInsertDirectly('paraphrase_recommended')).toBe(false)
    expect(canInsertDirectly('direct_forbidden')).toBe(false)
    expect(canInsertDirectly('not_applicable')).toBe(false)
  })

  it('returns immutable action lists for each quote policy', () => {
    const directActions = getAllowedSuggestionActions('direct_allowed')
    const paraphraseActions = getAllowedSuggestionActions('paraphrase_recommended')
    const forbiddenActions = getAllowedSuggestionActions('direct_forbidden')
    const notApplicableActions = getAllowedSuggestionActions('not_applicable')

    expect(directActions).toEqual(['insert_direct', 'paraphrase', 'open_detail'])
    expect(paraphraseActions).toEqual(['paraphrase', 'open_detail'])
    expect(forbiddenActions).toEqual(['open_detail', 'block'])
    expect(notApplicableActions).toEqual(['show_reminder', 'open_detail'])

    directActions.push('block')
    expect(getAllowedSuggestionActions('direct_allowed')).toEqual(['insert_direct', 'paraphrase', 'open_detail'])
  })
})
