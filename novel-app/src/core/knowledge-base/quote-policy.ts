import type {
  KnowledgeQuotePolicy,
  KnowledgeSourceType,
  KnowledgeSuggestedAction,
} from './types'

const SOURCE_POLICY: Record<KnowledgeSourceType, KnowledgeQuotePolicy> = {
  public_domain: 'direct_allowed',
  user_original: 'direct_allowed',
  copyrighted: 'paraphrase_recommended',
  unknown: 'paraphrase_recommended',
}

const ACTIONS_BY_POLICY: Record<KnowledgeQuotePolicy, KnowledgeSuggestedAction[]> = {
  direct_allowed: ['insert_direct', 'paraphrase', 'open_detail'],
  paraphrase_recommended: ['paraphrase', 'open_detail'],
  direct_forbidden: ['open_detail', 'block'],
  not_applicable: ['show_reminder', 'open_detail'],
}

export function deriveQuotePolicyForSource(sourceType: KnowledgeSourceType): KnowledgeQuotePolicy {
  return SOURCE_POLICY[sourceType]
}

export function canInsertDirectly(policy: KnowledgeQuotePolicy): boolean {
  return policy === 'direct_allowed'
}

export function getAllowedSuggestionActions(policy: KnowledgeQuotePolicy): KnowledgeSuggestedAction[] {
  return [...ACTIONS_BY_POLICY[policy]]
}
