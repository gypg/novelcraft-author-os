# NovelCraft Author OS Sprint A-F Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the frozen NovelCraft Author OS v6.2 path from Knowledge Base Foundation through Writing Cockpit without expanding product scope.

**Architecture:** The Rust/Tauri side remains the authoritative persistence layer using SQLite migrations and Tauri commands. TypeScript adds focused pure modules for knowledge DTOs, quote policy, import candidates, filtering, ranking, and cockpit aggregation; React pages consume repositories and pure helpers. Sprint A-C form the MVP; Sprint D-F build the full Author OS layer on top of that MVP.

**Tech Stack:** Tauri 2, Rust, rusqlite, React 19, TypeScript, Vite, Vitest, Zustand, SQLite.

---

## Frozen Owner Decisions This Plan Enforces

- Sprint order is **A → B → C → D → E → F**; do not revert to old Phase order.
- `knowledge_items.status` values are only `proposal | pending | confirmed | archived`.
- Long-term knowledge lifecycle is `proposal → pending → confirmed`.
- Author Memory allows at most one `active` version per `author_profile`.
- `KnowledgeCandidate` includes `canonicalLevel: 'canonical' | 'reference' | 'inspiration'`.
- Retrieval priority remains `Project > Author > External`.
- Local-first implementation: SQLite + Repository + tag search + BM25 before embeddings/graph.
- AI can generate/suggest; AI cannot silently mutate canonical data.

## Scope Boundary

This plan decomposes Sprint A-F. Execute it sprint-by-sprint. Do **not** begin Sprint B until Sprint A verification passes; do **not** begin Sprint D until Sprint A-C MVP verification passes. Sprint G-I are intentionally excluded from implementation work here.

## Review Patch v1 — Mandatory Before Execution

This patch incorporates subagent review findings. If a later task conflicts with this section, this section wins.

### Patch A: Sprint A CRUD and Tag Coverage

Sprint A implementation is incomplete unless it includes all of these commands and repository functions:

```typescript
createKnowledgeSource(input)
listKnowledgeSources()
updateKnowledgeSource(id, input)
deleteKnowledgeSource(id)

createKnowledgeTag(input)
listKnowledgeTags(filter?)
updateKnowledgeTag(id, input)
deleteKnowledgeTag(id)

attachKnowledgeTagToItem(itemId, tagId)
detachKnowledgeTagFromItem(itemId, tagId)
listKnowledgeItemTags(itemId)
```

Add tests before implementation:

```typescript
it('creates, updates, and deletes sources without mutating returned source rows', async () => {
  const source = await createKnowledgeSource({ id: 'source-1', title: '来源', source_type: 'unknown' })
  const updated = await updateKnowledgeSource(source.id, { title: '新来源' })
  expect(source.title).toBe('来源')
  expect(updated.title).toBe('新来源')
  await deleteKnowledgeSource(source.id)
  expect(await listKnowledgeSources()).toEqual([])
})

it('creates tags and assigns them idempotently to items', async () => {
  await createKnowledgeItem({
    id: 'item-1', source_id: null, book_id: null, library_type: 'external', canonical_level: 'inspiration',
    item_type: 'quote', content: '雨夜素材', quote_policy: 'paraphrase_recommended', status: 'confirmed', metadata_json: '{}', notes: '',
  })
  const tag = await createKnowledgeTag({ id: 'tag-1', category: 'scene', name: '雨夜', color: '#3b82f6' })
  await attachKnowledgeTagToItem('item-1', tag.id)
  await attachKnowledgeTagToItem('item-1', tag.id)
  expect(await listKnowledgeItemTags('item-1')).toHaveLength(1)
})
```

### Patch B: Import Candidate Lifecycle

Transient UI candidates start as `proposal`, but before persistence they must be staged to `pending`; user confirmation then writes `confirmed`.

Replace `confirmImportCandidate(candidate)` with two helpers:

```typescript
export function stageImportCandidate(candidate: ImportCandidate): ImportCandidate {
  return { ...candidate, status: 'pending' }
}

export function confirmPendingImportCandidate(candidate: ImportCandidate): ImportCandidate {
  if (candidate.status !== 'pending') {
    throw new Error('Only pending import candidates can be confirmed')
  }
  return { ...candidate, status: 'confirmed' }
}
```

Required test:

```typescript
const staged = stageImportCandidate(candidate)
const confirmed = confirmPendingImportCandidate(staged)
expect(candidate.status).toBe('proposal')
expect(staged.status).toBe('pending')
expect(confirmed.status).toBe('confirmed')
```

### Patch C: Source Type and Quote Policy

`source_type` is source-level in Sprint A. Mixed excerpt safety is handled by item-level `knowledge_items.quote_policy`. Do not add item-level `source_type` in Sprint A.

### Patch D: Author Profile UI Placement

Do not add a top-level sidebar route for Author Profile. Implement Author Profile as a section/tab inside `/knowledge-base` named `作者档案`, matching the frozen main nav: 书库 / 编辑器 / 知识库 / AI 助手 / 导出 / 设置.

### Patch E: Sprint B Anti-AI Integration

Sprint B is incomplete unless `forbidden_words` and `common_phrases` are wired into anti-AI/style guard paths. Add a tested helper:

```typescript
export function buildAuthorAntiAiRules(profile: AuthorProfileRow | null): string[] {
  if (!profile) return []
  return [...parseJsonStringArray(profile.forbidden_words), ...parseJsonStringArray(profile.common_phrases)]
}
```

Then inject these rules into `buildStyleGuardPrompt()` or an adjacent prompt section consumed by Writer/rewrite/polish operations.

### Patch F: Sprint D Agent Integration

Add a Task D3 after persistence:

- Load only `status='active'` Author Memory by default.
- Writer Agent injects active memory fingerprint.
- Auditor/style drift path compares output against active memory.
- If no active memory exists, generation continues using Author Profile only and logs/displays a non-blocking hint.

### Patch G: Sprint E Full Retrieval Scope

Add Tasks E3-E4:

- E3: conflict filtering and style-difference downrank. External candidates that contradict project facts are blocked; author-style mismatch adds `conflictFlags: ['style_difference']` and downranks within the external layer.
- E4: debug display in `InspirationPanel`: show scoreBreakdown, trace retrieval source, and conflict flags. LLM rerank/paraphrase is a boundary hook only in Sprint E unless provider integration is already stable; it must not be required for MVP A-C.

The 60/25/15 rule is hard layer priority + explanatory scoreBreakdown. It is not allowed for external text similarity to outrank project canonical facts.

### Patch H: Sprint F Right Panel Order

Sprint F must hide old right-panel tabs from the default visible tab bar. The visible order is exactly:

```text
驾驶舱 → 大纲 → 灵感 → 审稿 → 版本
```

Character/timeline/knowledge/context/constraints panels may remain mounted internally only if needed for backward compatibility, but they must not appear in the default right-panel tab bar without a new approved spec patch.

### Patch I: Import Candidate to Repository Mapping

`ImportCandidate` must include `book_id: string | null`, or it cannot become `CreateKnowledgeItemInput`. Add this field to `BuildImportCandidatesInput` and generated candidates:

```typescript
export interface BuildImportCandidatesInput {
  text: string
  sourceId: string | null
  sourceType: KnowledgeSourceType
  bookId?: string | null
}

export function toCreateKnowledgeItemInput(candidate: ImportCandidate): CreateKnowledgeItemInput {
  return {
    id: candidate.id,
    source_id: candidate.source_id,
    book_id: candidate.book_id,
    library_type: candidate.library_type,
    canonical_level: candidate.canonical_level,
    item_type: candidate.item_type,
    content: candidate.content,
    quote_policy: candidate.quote_policy,
    status: candidate.status,
    metadata_json: candidate.metadata_json,
    notes: candidate.notes,
  }
}
```

Required test:

```typescript
const [candidate] = buildImportCandidates({ text: '素材', sourceId: 'source-1', sourceType: 'unknown', bookId: 'book-1' })
const confirmed = confirmPendingImportCandidate(stageImportCandidate(candidate))
expect(toCreateKnowledgeItemInput(confirmed).book_id).toBe('book-1')
```

### Patch J: Exact Rust Command Requirements

Before any Rust command task starts, define structs in `knowledge.rs` with `#[serde(rename_all = "camelCase")]` for filter/update inputs that receive camelCase from TypeScript. Required commands:

```rust
#[tauri::command]
pub fn create_knowledge_source(state: State<'_, DbConn>, input: CreateKnowledgeSourceInput) -> Result<KnowledgeSourceRow, String>
#[tauri::command]
pub fn list_knowledge_sources(state: State<'_, DbConn>) -> Result<Vec<KnowledgeSourceRow>, String>
#[tauri::command]
pub fn update_knowledge_source(state: State<'_, DbConn>, id: String, input: UpdateKnowledgeSourceInput) -> Result<KnowledgeSourceRow, String>
#[tauri::command]
pub fn delete_knowledge_source(state: State<'_, DbConn>, id: String) -> Result<(), String>
#[tauri::command]
pub fn create_knowledge_item(state: State<'_, DbConn>, input: CreateKnowledgeItemInput) -> Result<KnowledgeItemRow, String>
#[tauri::command]
pub fn list_knowledge_items(state: State<'_, DbConn>, filter: ListKnowledgeItemsFilter) -> Result<Vec<KnowledgeItemRow>, String>
#[tauri::command]
pub fn update_knowledge_item(state: State<'_, DbConn>, id: String, input: UpdateKnowledgeItemInput) -> Result<KnowledgeItemRow, String>
#[tauri::command]
pub fn create_knowledge_tag(state: State<'_, DbConn>, input: CreateKnowledgeTagInput) -> Result<KnowledgeTagRow, String>
#[tauri::command]
pub fn list_knowledge_tags(state: State<'_, DbConn>, filter: ListKnowledgeTagsFilter) -> Result<Vec<KnowledgeTagRow>, String>
#[tauri::command]
pub fn update_knowledge_tag(state: State<'_, DbConn>, id: String, input: UpdateKnowledgeTagInput) -> Result<KnowledgeTagRow, String>
#[tauri::command]
pub fn delete_knowledge_tag(state: State<'_, DbConn>, id: String) -> Result<(), String>
#[tauri::command]
pub fn attach_knowledge_tag_to_item(state: State<'_, DbConn>, item_id: String, tag_id: String) -> Result<(), String>
#[tauri::command]
pub fn detach_knowledge_tag_from_item(state: State<'_, DbConn>, item_id: String, tag_id: String) -> Result<(), String>
#[tauri::command]
pub fn list_knowledge_item_tags(state: State<'_, DbConn>, item_id: String) -> Result<Vec<KnowledgeTagRow>, String>
```

Rust tests must cover create/list/update/filter for source/item/tag and idempotent tag attach. If a command uses dynamic SQL, test at least two combinations of optional filter fields.

### Patch K: Sidebar Navigation Refactor First

Before adding `/knowledge-base`, refactor `Sidebar.tsx` away from `NAV_ITEMS[n]` indexing into explicit arrays:

```typescript
const WRITING_NAV_ITEMS = [
  { path: '/', label: '书架', icon: BookOpen },
  { path: '/editor', label: '编辑器', icon: PenLine },
  { path: '/knowledge-base', label: '知识库', icon: BookMarked },
  { path: '/ai', label: 'AI 助手', icon: Bot },
]
```

Then define `WORLD_NAV_ITEMS` and `ADVANCED_NAV_ITEMS`. Do not insert into the current `NAV_ITEMS` array without this refactor; it will shift hard-coded indexes.

### Patch L: Author Profile Default Semantics

Sprint B uses “latest updated profile wins” as the default profile until a dedicated default flag is approved. Repository function `getDefaultAuthorProfile()` returns the profile with greatest `updated_at`, or `null`.

Author profile prompt injection must affect both current writing paths:

- `src/core/ai-engine/context-builder.ts`
- `src/core/ai-engine/agents/writer-agent.ts`

If the active/default profile is unavailable, generation continues without throwing.

### Patch M: RightPanel Data Wiring

Before C2/F2 UI work, define a pure selector/data hook that supplies panel data from current stores/repositories. `RightPanel` currently receives only `bookId`; do not make `InspirationPanel` require unavailable props.

Acceptable implementation:

```typescript
interface EditorContextSnapshot {
  bookId: string
  chapterId: string | null
  chapterTitle: string | null
  chapterIndex: number | null
  currentText: string
  wordCount: number
}
```

Populate it by extending `useEditorStore` with immutable current chapter metadata/content, or by passing the snapshot from `EditorPage` into `RightPanel`. Add `.test.ts` tests for the pure selector/aggregator; do not rely only on manual UI checks.

### Patch N: Author Memory Exact Types

Before Task D1 implementation, create `author-memory-types.ts` with at least:

```typescript
export type AuthorMemoryStatus = 'active' | 'archived' | 'experimental'
export type AuthorMemorySnapshotType = 'auto_incremental' | 'manual_full_rebuild' | 'before_rebuild' | 'user_named'

export interface AuthorMemoryVersionDraft {
  profile_id: string
  version_name: string
  status: AuthorMemoryStatus
  analysis_scope: string
  sample_word_count: number
  avg_sentence_length: number
  sentence_length_variance: number
  dialogue_ratio: number
  top_words: string
  top_phrases: string
  rhythm_pattern: string
  punctuation_density: number
  paragraph_avg_length: number
  scene_transition_style: string
  chapter_opening_patterns: string
  chapter_ending_patterns: string
  fingerprint_json: string
}
```

D2 must also specify exact `author_memory_versions` and `author_memory_snapshots` row/input structs, repository API, `lib.rs` registrations, and tests for the partial unique active index.

### Patch O: BM25 Reuse and Score Normalization

Sprint E must first inspect existing `src/core/temporal-memory/bm25.ts`. Prefer wrapping/reusing it instead of duplicating BM25 logic. Normalize all raw lexical scores to `0..1` before ranking. Add a test where an external candidate has a very high raw lexical score but still cannot outrank a project canonical candidate.

### Patch P: UI Test Strategy

Current Vitest is node-only and includes `src/**/*.test.ts`. UI-heavy tasks must expose pure view-model/selector functions and test those in `.test.ts` files. Do not add `.test.tsx`/jsdom unless the plan is explicitly updated to change Vitest config.

## Existing Code Patterns to Preserve

- Frontend repositories live in `novel-app/src/core/db/` and use dynamic Tauri `invoke` guarded by `isTauri()`.
- Existing Rust schema initialization is in `novel-app/src-tauri/src/db.rs` through `_schema_meta` and `CURRENT_SCHEMA_VERSION`.
- To avoid growing `db.rs` further, new Rust commands live in focused modules (`knowledge.rs`, `author_os.rs`) while `db.rs` only calls migration functions.
- Current Vitest config only includes `src/**/*.test.ts`, so plan tests as `.test.ts` files unless the config is intentionally updated.

## New / Modified File Map

### Sprint A: Knowledge Base Foundation

- Create `novel-app/src/core/knowledge-base/types.ts` — enums, DTOs, and immutable input/output types.
- Create `novel-app/src/core/knowledge-base/quote-policy.ts` — source-type to quote-policy rules and action permissions.
- Create `novel-app/src/core/knowledge-base/import-candidates.ts` — paste splitting and candidate lifecycle helpers.
- Create `novel-app/src/core/knowledge-base/knowledge-filter.ts` — pure list/search/filter helper.
- Create `novel-app/src/core/db/knowledge-base-repository.ts` — Tauri + immutable browser fallback repository.
- Create `novel-app/src/core/knowledge-base/*.test.ts` and `novel-app/src/core/db/knowledge-base-repository.test.ts` — unit tests.
- Create `novel-app/src-tauri/src/knowledge.rs` — Sprint A migration, row/input structs, and Tauri commands.
- Modify `novel-app/src-tauri/src/db.rs` — bump schema version and call Sprint A migration.
- Modify `novel-app/src-tauri/src/lib.rs` — register `knowledge` module and commands.
- Create `novel-app/src/modules/knowledge-base/KnowledgeBasePage.tsx` — source/tag/item CRUD and paste import UI.
- Create `novel-app/src/modules/knowledge-base/store.ts` — focused Zustand state for selected filters and draft import candidates.
- Modify `novel-app/src/App.tsx` — add `/knowledge-base` route.
- Modify `novel-app/src/app/components/Sidebar.tsx` — add `知识库` navigation item.

### Sprint B: Author Profile

- Create `novel-app/src/core/author-os/author-profile-types.ts` — profile DTOs and prompt helper types.
- Create `novel-app/src/core/author-os/author-profile-prompt.ts` — prompt section builder for Writer Agent.
- Create `novel-app/src/core/db/author-profile-repository.ts` — Tauri + immutable fallback repository.
- Create `novel-app/src-tauri/src/author_os.rs` — Author Profile migration and commands.
- Modify `novel-app/src-tauri/src/db.rs` — bump schema version and call Author Profile migration.
- Modify `novel-app/src-tauri/src/lib.rs` — register author profile commands.
- Create `novel-app/src/modules/knowledge-base/AuthorProfileSection.tsx` — profile editor embedded under Knowledge Base.
- Modify `novel-app/src/modules/knowledge-base/KnowledgeBasePage.tsx` — add `作者档案` section/tab.
- Modify `novel-app/src/core/ai-engine/agents/writer-agent.ts` and/or `context-builder.ts` — inject explicit profile constraints.

### Sprint C: Inspiration Panel v1

- Create `novel-app/src/core/knowledge-base/inspiration-v1.ts` — lightweight retrieval using keyword/tag/item_type and library grouping.
- Create `novel-app/src/modules/editor/InspirationPanel.tsx` — right-panel recommendations.
- Modify `novel-app/src/modules/editor/store.ts` — add `inspiration` right-panel tab.
- Modify `novel-app/src/app/components/RightPanel.tsx` — add inspiration tab and content.
- Modify `novel-app/src/core/db/knowledge-base-repository.ts` — suggestion status helpers if not already added in Sprint A.

### Sprint D: Author Memory

- Create `novel-app/src/core/author-os/author-memory-types.ts` — version/snapshot DTOs.
- Create `novel-app/src/core/author-os/author-memory-analysis.ts` — style fingerprint extraction from chapters.
- Create `novel-app/src/core/db/author-memory-repository.ts` — memory version/snapshot repository.
- Modify `novel-app/src-tauri/src/author_os.rs` — memory migration, active unique index, version/snapshot commands.
- Modify `novel-app/src-tauri/src/db.rs` — bump schema version and call Author Memory migration.
- Create `novel-app/src/modules/author-profile/AuthorMemoryPanel.tsx` — version list, active switch, snapshots.
- Modify Writer/Auditor prompt builders to read only active Author Memory by default.

### Sprint E: Retrieval Ranking

- Create `novel-app/src/core/knowledge-base/knowledge-candidate.ts` — frozen `KnowledgeCandidate` contract.
- Create `novel-app/src/core/knowledge-base/bm25.ts` — local BM25 scorer for text search.
- Create `novel-app/src/core/knowledge-base/retrieval-ranking.ts` — 60/25/15 ranking, canonical level weighting, trace output.
- Create `novel-app/src/core/knowledge-base/conflict-filter.ts` — conflict filtering and style-difference flags.
- Modify `InspirationPanel.tsx` — display scoreBreakdown, trace, and conflict flags.

### Sprint F: Writing Cockpit

- Create `novel-app/src/core/cockpit/cockpit-types.ts` — cockpit DTOs.
- Create `novel-app/src/core/cockpit/cockpit-aggregator.ts` — aggregate existing chapters, facts, truth files, suggestions, and word stats.
- Create `novel-app/src/modules/editor/WritingCockpitPanel.tsx` — compact/expanded cockpit UI.
- Modify `novel-app/src/modules/editor/store.ts` — add `cockpit` tab and make it default.
- Modify `novel-app/src/app/components/RightPanel.tsx` — update tab order to Cockpit, Outline, Inspiration, Audit, Versions.

---

# Sprint A — Knowledge Base Foundation

## User Journeys

1. As an author, I can create a source so I can track where imported material came from.
2. As an author, I can add quotes/notes with multi-dimensional tags so I can reuse them while writing.
3. As an author, I can paste a block of text and review candidates before anything becomes confirmed knowledge.
4. As an author, I can search and filter knowledge by library, type, status, quote policy, source, keyword, and tags.
5. As an author, I can see quote-policy restrictions so copyrighted/unknown sources do not offer unsafe direct insertion.

## Task A1: Create Knowledge Base Types and Quote Policy Helpers

**Files:**
- Create: `novel-app/src/core/knowledge-base/types.ts`
- Create: `novel-app/src/core/knowledge-base/quote-policy.ts`
- Test: `novel-app/src/core/knowledge-base/quote-policy.test.ts`

- [ ] **Step A1.1: Write the failing quote policy test**

```typescript
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
```

- [ ] **Step A1.2: Run the failing test**

Run from `novel-app`:

```powershell
npm test -- src/core/knowledge-base/quote-policy.test.ts
```

Expected: FAIL because `quote-policy.ts` does not exist.

- [ ] **Step A1.3: Add exact type definitions**

Create `novel-app/src/core/knowledge-base/types.ts`:

```typescript
export type KnowledgeSourceType = 'public_domain' | 'user_original' | 'copyrighted' | 'unknown'
export type KnowledgeLibraryType = 'external' | 'project' | 'author'
export type CanonicalLevel = 'canonical' | 'reference' | 'inspiration'

export type KnowledgeItemType =
  | 'quote'
  | 'note'
  | 'character'
  | 'location'
  | 'object'
  | 'hook'
  | 'summary'
  | 'idea'
  | 'technique'
  | 'analysis'

export type KnowledgeQuotePolicy =
  | 'direct_allowed'
  | 'paraphrase_recommended'
  | 'direct_forbidden'
  | 'not_applicable'

export type KnowledgeStatus = 'proposal' | 'pending' | 'confirmed' | 'archived'
export type KnowledgeTagCategory = 'usage' | 'scene' | 'emotion' | 'genre' | 'technique' | 'position' | 'custom'
export type KnowledgeRelationType = 'references' | 'inspires' | 'contradicts' | 'supports' | 'same_scene' | 'same_character'
export type KnowledgeSuggestionType = 'direct_quote' | 'paraphrase' | 'reminder' | 'style_hint'
export type KnowledgeSuggestionStatus = 'shown' | 'inserted' | 'dismissed' | 'blocked'
export type KnowledgeSuggestedAction = 'insert_direct' | 'paraphrase' | 'show_reminder' | 'open_detail' | 'block'

export interface KnowledgeSourceRow {
  id: string
  title: string
  author: string
  source_type: KnowledgeSourceType
  publication_year: number | null
  notes: string
  created_at: number
  updated_at: number
}

export interface KnowledgeItemRow {
  id: string
  source_id: string | null
  book_id: string | null
  library_type: KnowledgeLibraryType
  canonical_level: CanonicalLevel
  item_type: KnowledgeItemType
  content: string
  quote_policy: KnowledgeQuotePolicy
  status: KnowledgeStatus
  metadata_json: string
  notes: string
  created_at: number
  updated_at: number
}

export interface KnowledgeTagRow {
  id: string
  category: KnowledgeTagCategory
  name: string
  color: string
  created_at: number
  updated_at: number
}

export interface KnowledgeLinkRow {
  id: string
  from_item_id: string
  to_item_id: string
  relation_type: KnowledgeRelationType
  notes: string
  created_at: number
  updated_at: number
}

export interface KnowledgeSuggestionRow {
  id: string
  book_id: string
  chapter_id: string | null
  item_id: string | null
  suggestion_type: KnowledgeSuggestionType
  reason: string
  priority_level: 1 | 2 | 3
  status: KnowledgeSuggestionStatus
  quote_policy: KnowledgeQuotePolicy
  suggested_action: KnowledgeSuggestedAction
  score: number
  score_breakdown_json: string
  conflict_flags_json: string
  trace_json: string
  created_at: number
}
```

- [ ] **Step A1.4: Add quote policy implementation**

Create `novel-app/src/core/knowledge-base/quote-policy.ts`:

```typescript
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
```

- [ ] **Step A1.5: Run the test and verify it passes**

```powershell
npm test -- src/core/knowledge-base/quote-policy.test.ts
```

Expected: PASS.

- [ ] **Step A1.6: Commit checkpoint**

Only run this commit step if the user has authorized commits for this execution session.

```powershell
git add "novel-app/src/core/knowledge-base/types.ts" "novel-app/src/core/knowledge-base/quote-policy.ts" "novel-app/src/core/knowledge-base/quote-policy.test.ts"
git commit -m "feat: add knowledge quote policy helpers"
```

## Task A2: Add Import Candidate and Filtering Pure Helpers

**Files:**
- Create: `novel-app/src/core/knowledge-base/import-candidates.ts`
- Create: `novel-app/src/core/knowledge-base/knowledge-filter.ts`
- Test: `novel-app/src/core/knowledge-base/import-candidates.test.ts`
- Test: `novel-app/src/core/knowledge-base/knowledge-filter.test.ts`

- [ ] **Step A2.1: Write import candidate tests**

```typescript
import { describe, expect, it } from 'vitest'
import {
  buildImportCandidates,
  confirmPendingImportCandidate,
  rejectImportCandidate,
  stageImportCandidate,
  toCreateKnowledgeItemInput,
} from './import-candidates'

describe('knowledge import candidates', () => {
  it('splits pasted text into trimmed non-empty proposal candidates', () => {
    const candidates = buildImportCandidates({
      text: '  雨声压低了街巷。\n\n\n  风从窗缝里钻进来。 ',
      sourceId: 'source-1',
      sourceType: 'unknown',
      bookId: 'book-1',
    })

    expect(candidates).toHaveLength(2)
    expect(candidates[0]).toMatchObject({
      content: '雨声压低了街巷。',
      source_id: 'source-1',
      book_id: 'book-1',
      status: 'proposal',
      quote_policy: 'paraphrase_recommended',
    })
    expect(candidates[1].content).toBe('风从窗缝里钻进来。')
  })

  it('stages then confirms a candidate without mutating earlier states', () => {
    const [candidate] = buildImportCandidates({
      text: '这是用户原创素材。',
      sourceId: 'source-2',
      sourceType: 'user_original',
      bookId: 'book-1',
    })
    Object.freeze(candidate)

    const staged = stageImportCandidate(candidate)
    const confirmed = confirmPendingImportCandidate(staged)
    const createInput = toCreateKnowledgeItemInput(confirmed)

    expect(candidate.status).toBe('proposal')
    expect(staged.status).toBe('pending')
    expect(confirmed.status).toBe('confirmed')
    expect(createInput.book_id).toBe('book-1')
    expect(confirmed).not.toBe(candidate)
  })

  it('rejects a candidate immutably into archived status', () => {
    const [candidate] = buildImportCandidates({
      text: '这条不需要。',
      sourceId: null,
      sourceType: 'unknown',
      bookId: null,
    })

    const rejected = rejectImportCandidate(candidate)

    expect(rejected.status).toBe('archived')
    expect(candidate.status).toBe('proposal')
  })
})
```

- [ ] **Step A2.2: Write filter tests**

```typescript
import { describe, expect, it } from 'vitest'
import type { KnowledgeItemRow } from './types'
import { filterKnowledgeItems } from './knowledge-filter'

const baseItem: KnowledgeItemRow = {
  id: 'item-1',
  source_id: 'source-1',
  book_id: 'book-1',
  library_type: 'external',
  canonical_level: 'inspiration',
  item_type: 'quote',
  content: '雨夜里的旧城区',
  quote_policy: 'paraphrase_recommended',
  status: 'confirmed',
  metadata_json: '{}',
  notes: '氛围素材',
  created_at: 1,
  updated_at: 1,
}

describe('knowledge filtering', () => {
  it('filters by keyword, library type, item type, status, quote policy, and book', () => {
    const items: KnowledgeItemRow[] = [
      baseItem,
      { ...baseItem, id: 'item-2', content: '角色林默的秘密', library_type: 'project', canonical_level: 'canonical', item_type: 'character', quote_policy: 'not_applicable' },
      { ...baseItem, id: 'item-3', content: '作者常用短句', library_type: 'author', canonical_level: 'reference', item_type: 'analysis', quote_policy: 'not_applicable' },
      { ...baseItem, id: 'item-4', content: '归档素材', status: 'archived' },
    ]

    expect(filterKnowledgeItems(items, { keyword: '雨夜' }).map((item) => item.id)).toEqual(['item-1'])
    expect(filterKnowledgeItems(items, { libraryType: 'project' }).map((item) => item.id)).toEqual(['item-2'])
    expect(filterKnowledgeItems(items, { itemType: 'analysis' }).map((item) => item.id)).toEqual(['item-3'])
    expect(filterKnowledgeItems(items, { status: 'archived', includeArchived: true }).map((item) => item.id)).toEqual(['item-4'])
    expect(filterKnowledgeItems(items, { quotePolicy: 'paraphrase_recommended' }).map((item) => item.id)).toEqual(['item-1'])
    expect(filterKnowledgeItems(items, { bookId: 'book-1' }).map((item) => item.id)).toEqual(['item-1', 'item-2', 'item-3'])
  })

  it('excludes archived items by default and does not mutate input arrays', () => {
    const items = [baseItem, { ...baseItem, id: 'item-4', status: 'archived' as const }]
    const result = filterKnowledgeItems(items, {})

    expect(result.map((item) => item.id)).toEqual(['item-1'])
    result.push({ ...baseItem, id: 'new' })
    expect(items).toHaveLength(2)
  })
})
```

- [ ] **Step A2.3: Run failing tests**

```powershell
npm test -- src/core/knowledge-base/import-candidates.test.ts src/core/knowledge-base/knowledge-filter.test.ts
```

Expected: FAIL because helper modules do not exist.

- [ ] **Step A2.4: Add import candidate implementation**

Create `novel-app/src/core/knowledge-base/import-candidates.ts`:

```typescript
import { deriveQuotePolicyForSource } from './quote-policy'
import type { CreateKnowledgeItemInput } from '@/core/db/knowledge-base-repository'
import type { KnowledgeItemRow, KnowledgeSourceType } from './types'

export type ImportCandidate = Pick<
  KnowledgeItemRow,
  'source_id' | 'book_id' | 'content' | 'quote_policy' | 'status' | 'library_type' | 'canonical_level' | 'item_type' | 'metadata_json' | 'notes'
> & {
  id: string
}

export interface BuildImportCandidatesInput {
  text: string
  sourceId: string | null
  sourceType: KnowledgeSourceType
  bookId?: string | null
}

function createCandidateId(index: number, content: string): string {
  const normalized = content.slice(0, 24).replace(/\s+/g, '-')
  return `candidate-${index + 1}-${normalized}`
}

export function buildImportCandidates(input: BuildImportCandidatesInput): ImportCandidate[] {
  return input.text
    .split(/\n\s*\n/g)
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .map((content, index) => ({
      id: createCandidateId(index, content),
      source_id: input.sourceId,
      book_id: input.bookId ?? null,
      library_type: 'external',
      canonical_level: 'inspiration',
      item_type: 'quote',
      content,
      quote_policy: deriveQuotePolicyForSource(input.sourceType),
      status: 'proposal',
      metadata_json: '{}',
      notes: '',
    }))
}

export function stageImportCandidate(candidate: ImportCandidate): ImportCandidate {
  return { ...candidate, status: 'pending' }
}

export function confirmPendingImportCandidate(candidate: ImportCandidate): ImportCandidate {
  if (candidate.status !== 'pending') {
    throw new Error('Only pending import candidates can be confirmed')
  }
  return { ...candidate, status: 'confirmed' }
}

export function rejectImportCandidate(candidate: ImportCandidate): ImportCandidate {
  return { ...candidate, status: 'archived' }
}

export function toCreateKnowledgeItemInput(candidate: ImportCandidate): CreateKnowledgeItemInput {
  return {
    id: candidate.id,
    source_id: candidate.source_id,
    book_id: candidate.book_id,
    library_type: candidate.library_type,
    canonical_level: candidate.canonical_level,
    item_type: candidate.item_type,
    content: candidate.content,
    quote_policy: candidate.quote_policy,
    status: candidate.status,
    metadata_json: candidate.metadata_json,
    notes: candidate.notes,
  }
}
```

- [ ] **Step A2.5: Add filter implementation**

Create `novel-app/src/core/knowledge-base/knowledge-filter.ts`:

```typescript
import type {
  KnowledgeItemRow,
  KnowledgeItemType,
  KnowledgeLibraryType,
  KnowledgeQuotePolicy,
  KnowledgeStatus,
} from './types'

export interface KnowledgeFilterInput {
  keyword?: string
  bookId?: string
  sourceId?: string
  libraryType?: KnowledgeLibraryType
  itemType?: KnowledgeItemType
  status?: KnowledgeStatus
  quotePolicy?: KnowledgeQuotePolicy
  includeArchived?: boolean
}

function includesKeyword(item: KnowledgeItemRow, keyword: string): boolean {
  const normalizedKeyword = keyword.trim().toLowerCase()
  if (!normalizedKeyword) return true
  return [item.content, item.notes, item.metadata_json]
    .join('\n')
    .toLowerCase()
    .includes(normalizedKeyword)
}

export function filterKnowledgeItems(
  items: readonly KnowledgeItemRow[],
  filter: KnowledgeFilterInput,
): KnowledgeItemRow[] {
  return items.filter((item) => {
    if (!filter.includeArchived && item.status === 'archived') return false
    if (filter.keyword && !includesKeyword(item, filter.keyword)) return false
    if (filter.bookId && item.book_id !== filter.bookId) return false
    if (filter.sourceId && item.source_id !== filter.sourceId) return false
    if (filter.libraryType && item.library_type !== filter.libraryType) return false
    if (filter.itemType && item.item_type !== filter.itemType) return false
    if (filter.status && item.status !== filter.status) return false
    if (filter.quotePolicy && item.quote_policy !== filter.quotePolicy) return false
    return true
  }).map((item) => ({ ...item }))
}
```

- [ ] **Step A2.6: Run tests and verify pass**

```powershell
npm test -- src/core/knowledge-base/import-candidates.test.ts src/core/knowledge-base/knowledge-filter.test.ts
```

Expected: PASS.

- [ ] **Step A2.7: Commit checkpoint**

Only run if commits are authorized.

```powershell
git add "novel-app/src/core/knowledge-base/import-candidates.ts" "novel-app/src/core/knowledge-base/knowledge-filter.ts" "novel-app/src/core/knowledge-base/import-candidates.test.ts" "novel-app/src/core/knowledge-base/knowledge-filter.test.ts"
git commit -m "feat: add knowledge import and filter helpers"
```

## Task A3: Add Sprint A SQLite Migration in a Focused Rust Module

**Files:**
- Create: `novel-app/src-tauri/src/knowledge.rs`
- Modify: `novel-app/src-tauri/src/db.rs:75-105`
- Modify: `novel-app/src-tauri/src/lib.rs:1-4`

- [ ] **Step A3.1: Add the Rust migration module with tests**

Create `novel-app/src-tauri/src/knowledge.rs` with this initial migration and test block:

```rust
use rusqlite::Connection;

pub fn run_knowledge_migration_v3(conn: &Connection) {
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS knowledge_sources (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            author TEXT NOT NULL DEFAULT '',
            source_type TEXT NOT NULL DEFAULT 'unknown'
                CHECK (source_type IN ('public_domain', 'user_original', 'copyrighted', 'unknown')),
            publication_year INTEGER,
            notes TEXT NOT NULL DEFAULT '',
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_knowledge_sources_source_type ON knowledge_sources(source_type);
        CREATE INDEX IF NOT EXISTS idx_knowledge_sources_title ON knowledge_sources(title);

        CREATE TABLE IF NOT EXISTS knowledge_items (
            id TEXT PRIMARY KEY,
            source_id TEXT REFERENCES knowledge_sources(id) ON DELETE SET NULL,
            book_id TEXT REFERENCES books(id) ON DELETE CASCADE,
            library_type TEXT NOT NULL CHECK (library_type IN ('external', 'project', 'author')),
            canonical_level TEXT NOT NULL CHECK (canonical_level IN ('canonical', 'reference', 'inspiration')),
            item_type TEXT NOT NULL CHECK (item_type IN ('quote', 'note', 'character', 'location', 'object', 'hook', 'summary', 'idea', 'technique', 'analysis')),
            content TEXT NOT NULL,
            quote_policy TEXT NOT NULL DEFAULT 'not_applicable'
                CHECK (quote_policy IN ('direct_allowed', 'paraphrase_recommended', 'direct_forbidden', 'not_applicable')),
            status TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('proposal', 'pending', 'confirmed', 'archived')),
            metadata_json TEXT NOT NULL DEFAULT '{}',
            notes TEXT NOT NULL DEFAULT '',
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            CHECK (library_type != 'project' OR book_id IS NOT NULL),
            CHECK (library_type != 'external' OR canonical_level = 'inspiration'),
            CHECK (library_type != 'author' OR canonical_level = 'reference'),
            CHECK (library_type != 'project' OR canonical_level = 'canonical')
        );
        CREATE INDEX IF NOT EXISTS idx_knowledge_items_source_id ON knowledge_items(source_id);
        CREATE INDEX IF NOT EXISTS idx_knowledge_items_book_id ON knowledge_items(book_id);
        CREATE INDEX IF NOT EXISTS idx_knowledge_items_status ON knowledge_items(status);
        CREATE INDEX IF NOT EXISTS idx_knowledge_items_library_status ON knowledge_items(library_type, status);
        CREATE INDEX IF NOT EXISTS idx_knowledge_items_book_status_type ON knowledge_items(book_id, status, item_type);
        CREATE INDEX IF NOT EXISTS idx_knowledge_items_type_status ON knowledge_items(item_type, status);
        CREATE INDEX IF NOT EXISTS idx_knowledge_items_updated_at ON knowledge_items(updated_at);

        CREATE TABLE IF NOT EXISTS knowledge_tags (
            id TEXT PRIMARY KEY,
            category TEXT NOT NULL CHECK (category IN ('usage', 'scene', 'emotion', 'genre', 'technique', 'position', 'custom')),
            name TEXT NOT NULL,
            color TEXT NOT NULL DEFAULT '',
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            UNIQUE(category, name)
        );
        CREATE INDEX IF NOT EXISTS idx_knowledge_tags_category ON knowledge_tags(category);

        CREATE TABLE IF NOT EXISTS knowledge_item_tags (
            item_id TEXT NOT NULL REFERENCES knowledge_items(id) ON DELETE CASCADE,
            tag_id TEXT NOT NULL REFERENCES knowledge_tags(id) ON DELETE CASCADE,
            PRIMARY KEY (item_id, tag_id)
        );
        CREATE INDEX IF NOT EXISTS idx_knowledge_item_tags_tag_item ON knowledge_item_tags(tag_id, item_id);

        CREATE TABLE IF NOT EXISTS knowledge_links (
            id TEXT PRIMARY KEY,
            from_item_id TEXT NOT NULL REFERENCES knowledge_items(id) ON DELETE CASCADE,
            to_item_id TEXT NOT NULL REFERENCES knowledge_items(id) ON DELETE CASCADE,
            relation_type TEXT NOT NULL CHECK (relation_type IN ('references', 'inspires', 'contradicts', 'supports', 'same_scene', 'same_character')),
            notes TEXT NOT NULL DEFAULT '',
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            CHECK (from_item_id != to_item_id)
        );
        CREATE INDEX IF NOT EXISTS idx_knowledge_links_from_item ON knowledge_links(from_item_id);
        CREATE INDEX IF NOT EXISTS idx_knowledge_links_to_item ON knowledge_links(to_item_id);
        CREATE INDEX IF NOT EXISTS idx_knowledge_links_relation ON knowledge_links(relation_type);

        CREATE TABLE IF NOT EXISTS knowledge_suggestions (
            id TEXT PRIMARY KEY,
            book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
            chapter_id TEXT REFERENCES chapters(id) ON DELETE CASCADE,
            item_id TEXT REFERENCES knowledge_items(id) ON DELETE SET NULL,
            suggestion_type TEXT NOT NULL CHECK (suggestion_type IN ('direct_quote', 'paraphrase', 'reminder', 'style_hint')),
            reason TEXT NOT NULL DEFAULT '',
            priority_level INTEGER NOT NULL CHECK (priority_level BETWEEN 1 AND 3),
            status TEXT NOT NULL DEFAULT 'shown' CHECK (status IN ('shown', 'inserted', 'dismissed', 'blocked')),
            quote_policy TEXT NOT NULL DEFAULT 'not_applicable'
                CHECK (quote_policy IN ('direct_allowed', 'paraphrase_recommended', 'direct_forbidden', 'not_applicable')),
            suggested_action TEXT NOT NULL DEFAULT 'open_detail'
                CHECK (suggested_action IN ('insert_direct', 'paraphrase', 'show_reminder', 'open_detail', 'block')),
            score REAL NOT NULL DEFAULT 0,
            score_breakdown_json TEXT NOT NULL DEFAULT '{}',
            conflict_flags_json TEXT NOT NULL DEFAULT '[]',
            trace_json TEXT NOT NULL DEFAULT '{}',
            created_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_knowledge_suggestions_book_chapter ON knowledge_suggestions(book_id, chapter_id, created_at);
        CREATE INDEX IF NOT EXISTS idx_knowledge_suggestions_status ON knowledge_suggestions(status);
        CREATE INDEX IF NOT EXISTS idx_knowledge_suggestions_item_id ON knowledge_suggestions(item_id);
        CREATE INDEX IF NOT EXISTS idx_knowledge_suggestions_book_status ON knowledge_suggestions(book_id, status, created_at);"
    ).expect("Knowledge migration v3 failed");
}

#[cfg(test)]
mod tests {
    use super::*;
    use rusqlite::Connection;

    fn table_exists(conn: &Connection, table: &str) -> bool {
        conn.query_row(
            "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = ?1",
            [table],
            |row| row.get::<_, i64>(0),
        ).unwrap() == 1
    }

    #[test]
    fn migration_creates_sprint_a_tables_and_is_idempotent() {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch("PRAGMA foreign_keys = ON; CREATE TABLE books (id TEXT PRIMARY KEY); CREATE TABLE chapters (id TEXT PRIMARY KEY, book_id TEXT REFERENCES books(id));").unwrap();

        run_knowledge_migration_v3(&conn);
        run_knowledge_migration_v3(&conn);

        for table in [
            "knowledge_sources",
            "knowledge_items",
            "knowledge_tags",
            "knowledge_item_tags",
            "knowledge_links",
            "knowledge_suggestions",
        ] {
            assert!(table_exists(&conn, table), "missing table {table}");
        }
    }

    #[test]
    fn knowledge_item_status_rejects_old_parallel_names() {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch("PRAGMA foreign_keys = ON; CREATE TABLE books (id TEXT PRIMARY KEY); CREATE TABLE chapters (id TEXT PRIMARY KEY, book_id TEXT REFERENCES books(id));").unwrap();
        run_knowledge_migration_v3(&conn);

        let err = conn.execute(
            "INSERT INTO knowledge_items (id, library_type, canonical_level, item_type, content, quote_policy, status, created_at, updated_at)
             VALUES ('item-1', 'external', 'inspiration', 'quote', 'content', 'paraphrase_recommended', 'user_confirmed', 1, 1)",
            [],
        ).unwrap_err();

        assert!(err.to_string().contains("CHECK constraint failed"));
    }
}
```

- [ ] **Step A3.2: Wire migration into `db.rs`**

Modify `novel-app/src-tauri/src/db.rs`:

```rust
pub const CURRENT_SCHEMA_VERSION: u32 = 3;
```

Add this after the v2 block inside `init_db`:

```rust
    if current_version < 3 {
        crate::knowledge::run_knowledge_migration_v3(conn);
    }
```

- [ ] **Step A3.3: Wire module into `lib.rs`**

Add at the top of `novel-app/src-tauri/src/lib.rs`:

```rust
mod knowledge;
```

- [ ] **Step A3.4: Run Rust migration tests**

```powershell
cargo test --manifest-path "C:\Users\69058\Desktop\project\自研小说软件\novel-app\src-tauri\Cargo.toml" knowledge
```

Expected: PASS.

- [ ] **Step A3.5: Commit checkpoint**

Only run if commits are authorized.

```powershell
git add "novel-app/src-tauri/src/knowledge.rs" "novel-app/src-tauri/src/db.rs" "novel-app/src-tauri/src/lib.rs"
git commit -m "feat: add knowledge base database schema"
```

## Task A4: Add Sprint A Rust Commands and Frontend Repository

**Files:**
- Modify: `novel-app/src-tauri/src/knowledge.rs`
- Modify: `novel-app/src-tauri/src/lib.rs`
- Create: `novel-app/src/core/db/knowledge-base-repository.ts`
- Test: `novel-app/src/core/db/knowledge-base-repository.test.ts`

- [ ] **Step A4.1: Write repository immutability test**

```typescript
import { beforeEach, describe, expect, it } from 'vitest'
import {
  __resetKnowledgeRepositoryForTests,
  createKnowledgeItem,
  createKnowledgeSource,
  listKnowledgeItems,
  updateKnowledgeItem,
} from './knowledge-base-repository'

describe('knowledge base repository browser fallback', () => {
  beforeEach(() => __resetKnowledgeRepositoryForTests())

  it('creates and lists defensive copies of knowledge items', async () => {
    const source = await createKnowledgeSource({
      id: 'source-1',
      title: '摘抄来源',
      source_type: 'unknown',
    })

    const input = Object.freeze({
      id: 'item-1',
      source_id: source.id,
      book_id: null,
      library_type: 'external' as const,
      canonical_level: 'inspiration' as const,
      item_type: 'quote' as const,
      content: '雨夜里的旧城区',
      quote_policy: 'paraphrase_recommended' as const,
      status: 'confirmed' as const,
      metadata_json: '{}',
      notes: '',
    })

    const created = await createKnowledgeItem(input)
    const listed = await listKnowledgeItems({})
    listed[0].content = 'mutated outside repository'
    const listedAgain = await listKnowledgeItems({})

    expect(created.content).toBe('雨夜里的旧城区')
    expect(listedAgain[0].content).toBe('雨夜里的旧城区')
  })

  it('updates items immutably', async () => {
    await createKnowledgeItem({
      id: 'item-1',
      source_id: null,
      book_id: 'book-1',
      library_type: 'project',
      canonical_level: 'canonical',
      item_type: 'note',
      content: '旧内容',
      quote_policy: 'not_applicable',
      status: 'pending',
      metadata_json: '{}',
      notes: '',
    })

    const before = (await listKnowledgeItems({ includeArchived: true }))[0]
    const updated = await updateKnowledgeItem('item-1', { content: '新内容', status: 'confirmed' })

    expect(before.content).toBe('旧内容')
    expect(updated.content).toBe('新内容')
    expect(updated.status).toBe('confirmed')
  })
})
```

- [ ] **Step A4.2: Run failing repository test**

```powershell
npm test -- src/core/db/knowledge-base-repository.test.ts
```

Expected: FAIL because repository does not exist.

- [ ] **Step A4.3: Add minimal immutable frontend repository**

Create `novel-app/src/core/db/knowledge-base-repository.ts`:

```typescript
import { isTauri } from '@/shared/utils/tauri-env'
import { filterKnowledgeItems, type KnowledgeFilterInput } from '@/core/knowledge-base/knowledge-filter'
import type { KnowledgeItemRow, KnowledgeSourceRow, KnowledgeStatus } from '@/core/knowledge-base/types'

let _invoke: typeof import('@tauri-apps/api/core').invoke | null = null

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

export interface CreateKnowledgeSourceInput {
  id: string
  title: string
  author?: string
  source_type: KnowledgeSourceRow['source_type']
  publication_year?: number | null
  notes?: string
}

export type CreateKnowledgeItemInput = Omit<KnowledgeItemRow, 'created_at' | 'updated_at'>
export type UpdateKnowledgeItemInput = Partial<Pick<KnowledgeItemRow, 'content' | 'quote_policy' | 'status' | 'metadata_json' | 'notes'>>

let mockSources: KnowledgeSourceRow[] = []
let mockItems: KnowledgeItemRow[] = []

function now(): number {
  return Date.now()
}

function cloneSource(source: KnowledgeSourceRow): KnowledgeSourceRow {
  return { ...source }
}

function cloneItem(item: KnowledgeItemRow): KnowledgeItemRow {
  return { ...item }
}

export function __resetKnowledgeRepositoryForTests(): void {
  mockSources = []
  mockItems = []
}

export async function createKnowledgeSource(input: CreateKnowledgeSourceInput): Promise<KnowledgeSourceRow> {
  const inv = await getInvoke()
  if (inv) return inv<KnowledgeSourceRow>('create_knowledge_source', { input })

  const timestamp = now()
  const source: KnowledgeSourceRow = {
    id: input.id,
    title: input.title.trim(),
    author: input.author ?? '',
    source_type: input.source_type,
    publication_year: input.publication_year ?? null,
    notes: input.notes ?? '',
    created_at: timestamp,
    updated_at: timestamp,
  }
  mockSources = [...mockSources, source]
  return cloneSource(source)
}

export async function listKnowledgeSources(): Promise<KnowledgeSourceRow[]> {
  const inv = await getInvoke()
  if (inv) return inv<KnowledgeSourceRow[]>('list_knowledge_sources')
  return mockSources.map(cloneSource).sort((a, b) => b.updated_at - a.updated_at)
}

export async function createKnowledgeItem(input: CreateKnowledgeItemInput): Promise<KnowledgeItemRow> {
  const inv = await getInvoke()
  if (inv) return inv<KnowledgeItemRow>('create_knowledge_item', { input })

  const timestamp = now()
  const item: KnowledgeItemRow = {
    ...input,
    created_at: timestamp,
    updated_at: timestamp,
  }
  mockItems = [...mockItems, item]
  return cloneItem(item)
}

export async function listKnowledgeItems(filter: KnowledgeFilterInput = {}): Promise<KnowledgeItemRow[]> {
  const inv = await getInvoke()
  if (inv) return inv<KnowledgeItemRow[]>('list_knowledge_items', { filter })
  return filterKnowledgeItems(mockItems.map(cloneItem), filter)
}

export async function updateKnowledgeItem(id: string, input: UpdateKnowledgeItemInput): Promise<KnowledgeItemRow> {
  const inv = await getInvoke()
  if (inv) return inv<KnowledgeItemRow>('update_knowledge_item', { id, input })

  const existing = mockItems.find((item) => item.id === id)
  if (!existing) throw new Error('Knowledge item not found')
  const updated: KnowledgeItemRow = {
    ...existing,
    ...Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)),
    updated_at: now(),
  }
  mockItems = mockItems.map((item) => item.id === id ? updated : item)
  return cloneItem(updated)
}

export async function setKnowledgeItemStatus(id: string, status: KnowledgeStatus): Promise<KnowledgeItemRow> {
  return updateKnowledgeItem(id, { status })
}
```

- [ ] **Step A4.4: Add Rust command structs and register command names**

Append typed row/input structs and source/item command functions to `knowledge.rs`. Use the same enum strings as TypeScript. Register at least these commands in `lib.rs`:

```rust
knowledge::create_knowledge_source,
knowledge::list_knowledge_sources,
knowledge::create_knowledge_item,
knowledge::list_knowledge_items,
knowledge::update_knowledge_item,
```

The implementation must use fixed SQL parameter order and return `Result<T, String>`. For update, use `COALESCE(?field, field)` style or carefully ordered dynamic SQL; do not copy `update_outline_node` parameter ordering.

- [ ] **Step A4.5: Run repository and Rust checks**

```powershell
npm test -- src/core/db/knowledge-base-repository.test.ts
cargo check --manifest-path "C:\Users\69058\Desktop\project\自研小说软件\novel-app\src-tauri\Cargo.toml"
```

Expected: PASS.

- [ ] **Step A4.6: Commit checkpoint**

Only run if commits are authorized.

```powershell
git add "novel-app/src/core/db/knowledge-base-repository.ts" "novel-app/src/core/db/knowledge-base-repository.test.ts" "novel-app/src-tauri/src/knowledge.rs" "novel-app/src-tauri/src/lib.rs"
git commit -m "feat: add knowledge base repository"
```

## Task A5: Add Knowledge Base Page and Navigation

**Files:**
- Create: `novel-app/src/modules/knowledge-base/store.ts`
- Create: `novel-app/src/modules/knowledge-base/KnowledgeBasePage.tsx`
- Modify: `novel-app/src/App.tsx`
- Modify: `novel-app/src/app/components/Sidebar.tsx`

- [ ] **Step A5.1: Add a minimal focused store**

Create `novel-app/src/modules/knowledge-base/store.ts`:

```typescript
import { create } from 'zustand'
import type { KnowledgeFilterInput } from '@/core/knowledge-base/knowledge-filter'
import type { ImportCandidate } from '@/core/knowledge-base/import-candidates'

interface KnowledgeBaseState {
  filter: KnowledgeFilterInput
  importCandidates: ImportCandidate[]
  setFilter: (filter: KnowledgeFilterInput) => void
  setImportCandidates: (candidates: ImportCandidate[]) => void
  clearImportCandidates: () => void
}

export const useKnowledgeBaseStore = create<KnowledgeBaseState>((set) => ({
  filter: {},
  importCandidates: [],
  setFilter: (filter) => set({ filter: { ...filter } }),
  setImportCandidates: (candidates) => set({ importCandidates: candidates.map((candidate) => ({ ...candidate })) }),
  clearImportCandidates: () => set({ importCandidates: [] }),
}))
```

- [ ] **Step A5.2: Add the page component**

Create `novel-app/src/modules/knowledge-base/KnowledgeBasePage.tsx` with a simple, stable first UI: source count, item count, keyword input, library/status filters, paste import textarea, candidate preview, and confirmed list. Use repository functions from Task A4 and helpers from Task A2. Keep UI inline-styled like current pages if no shared component exists.

Required behavior in this component:

```typescript
// Required component-level rules for the implementation:
// 1. Manual user-created items may be saved as status='confirmed'.
// 2. Paste import creates proposal candidates first.
// 3. Confirming candidates writes status='confirmed'.
// 4. Archived candidates are never persisted as confirmed items.
// 5. quote_policy controls whether the UI shows direct insertion messaging.
```

- [ ] **Step A5.3: Add route in App**

Add lazy import in `novel-app/src/App.tsx`:

```typescript
const KnowledgeBasePage = lazy(() => import('./modules/knowledge-base/KnowledgeBasePage').then((m) => ({ default: m.KnowledgeBasePage })))
```

Add route inside `AppLayout`:

```tsx
<Route path="knowledge-base" element={<PageErrorBoundary><LazyPage><KnowledgeBasePage /></LazyPage></PageErrorBoundary>} />
```

- [ ] **Step A5.4: Add sidebar entry**

In `Sidebar.tsx`, add `BookMarked` or another available icon entry:

```typescript
{ path: '/knowledge-base', label: '知识库', icon: BookMarked }
```

Place it in the writing/world section before `真相文件` so it matches v6.2 main navigation.

- [ ] **Step A5.5: Run frontend checks**

```powershell
npm run lint
npx tsc -b --noEmit
npm test -- src/core/knowledge-base/quote-policy.test.ts src/core/knowledge-base/import-candidates.test.ts src/core/knowledge-base/knowledge-filter.test.ts src/core/db/knowledge-base-repository.test.ts
```

Expected: all commands PASS.

- [ ] **Step A5.6: Commit checkpoint**

Only run if commits are authorized.

```powershell
git add "novel-app/src/modules/knowledge-base" "novel-app/src/App.tsx" "novel-app/src/app/components/Sidebar.tsx"
git commit -m "feat: add knowledge base page"
```

---

# Sprint B — Author Profile

## User Journeys

1. As an author, I can create/edit my explicit author profile.
2. As an author, I can list forbidden words and common phrases.
3. As a writer agent, AI continuation inherits explicit profile constraints.

## Task B1: Add Author Profile Types, Prompt Helper, and Tests

**Files:**
- Create: `novel-app/src/core/author-os/author-profile-types.ts`
- Create: `novel-app/src/core/author-os/author-profile-prompt.ts`
- Test: `novel-app/src/core/author-os/author-profile-prompt.test.ts`

- [ ] **Step B1.1: Write failing prompt helper test**

```typescript
import { describe, expect, it } from 'vitest'
import { buildAuthorProfilePromptSection } from './author-profile-prompt'
import type { AuthorProfileRow } from './author-profile-types'

const profile: AuthorProfileRow = {
  id: 'profile-1',
  name: '山海',
  preferred_genres: '["玄幻", "慢热"]',
  writing_style: '短句为主，少用解释性旁白。',
  common_phrases: '["没人知道", "直到这一刻"]',
  favorite_themes: '["成长", "命运"]',
  forbidden_words: '["竟然", "不禁"]',
  pov_preference: '第三人称限知',
  pace_preference: '波浪式',
  notes: '不要过度抒情。',
  created_at: 1,
  updated_at: 1,
}

describe('author profile prompt', () => {
  it('builds explicit constraints without mutating the profile', () => {
    Object.freeze(profile)
    const prompt = buildAuthorProfilePromptSection(profile)

    expect(prompt).toContain('## 作者显式风格约束')
    expect(prompt).toContain('笔名：山海')
    expect(prompt).toContain('偏好题材：玄幻、慢热')
    expect(prompt).toContain('禁用词：竟然、不禁')
    expect(prompt).toContain('常用句式：没人知道、直到这一刻')
  })
})
```

- [ ] **Step B1.2: Implement exact types and prompt helper**

Create `author-profile-types.ts`:

```typescript
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
```

Create `author-profile-prompt.ts`:

```typescript
import type { AuthorProfileRow } from './author-profile-types'

function parseJsonStringArray(value: string): string[] {
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : []
  } catch {
    return []
  }
}

function formatList(value: string): string {
  const items = parseJsonStringArray(value)
  return items.length > 0 ? items.join('、') : '未设置'
}

export function buildAuthorProfilePromptSection(profile: AuthorProfileRow | null): string {
  if (!profile) return ''
  return [
    '## 作者显式风格约束',
    `- 笔名：${profile.name}`,
    `- 偏好题材：${formatList(profile.preferred_genres)}`,
    `- 自述风格：${profile.writing_style || '未设置'}`,
    `- 常用句式：${formatList(profile.common_phrases)}`,
    `- 偏好主题：${formatList(profile.favorite_themes)}`,
    `- 禁用词：${formatList(profile.forbidden_words)}`,
    `- 视角偏好：${profile.pov_preference || '未设置'}`,
    `- 节奏偏好：${profile.pace_preference || '未设置'}`,
    `- 备注：${profile.notes || '无'}`,
  ].join('\n')
}
```

- [ ] **Step B1.3: Run tests**

```powershell
npm test -- src/core/author-os/author-profile-prompt.test.ts
```

Expected: PASS.

## Task B2: Add Author Profile Persistence and Page

**Files:**
- Modify: `novel-app/src-tauri/src/author_os.rs`
- Modify: `novel-app/src-tauri/src/db.rs`
- Modify: `novel-app/src-tauri/src/lib.rs`
- Create: `novel-app/src/core/db/author-profile-repository.ts`
- Create: `novel-app/src/modules/knowledge-base/AuthorProfileSection.tsx`
- Modify: `novel-app/src/modules/knowledge-base/KnowledgeBasePage.tsx`
- Modify: `novel-app/src/app/components/Sidebar.tsx`

- [ ] **Step B2.1: Add Rust migration v4**

Create or update `author_os.rs`:

```rust
use rusqlite::Connection;

pub fn run_author_profile_migration_v4(conn: &Connection) {
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS author_profiles (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            preferred_genres TEXT NOT NULL DEFAULT '[]',
            writing_style TEXT NOT NULL DEFAULT '',
            common_phrases TEXT NOT NULL DEFAULT '[]',
            favorite_themes TEXT NOT NULL DEFAULT '[]',
            forbidden_words TEXT NOT NULL DEFAULT '[]',
            pov_preference TEXT NOT NULL DEFAULT '',
            pace_preference TEXT NOT NULL DEFAULT '',
            notes TEXT NOT NULL DEFAULT '',
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_author_profiles_updated_at ON author_profiles(updated_at);"
    ).expect("Author Profile migration v4 failed");
}
```

Bump `CURRENT_SCHEMA_VERSION` to `4` in `db.rs` and call `crate::author_os::run_author_profile_migration_v4(conn)` when `current_version < 4`.

- [ ] **Step B2.2: Add repository and UI**

Implement repository functions:

```typescript
export async function createAuthorProfile(input: CreateAuthorProfileInput): Promise<AuthorProfileRow>
export async function listAuthorProfiles(): Promise<AuthorProfileRow[]>
export async function updateAuthorProfile(id: string, input: UpdateAuthorProfileInput): Promise<AuthorProfileRow>
export async function getDefaultAuthorProfile(): Promise<AuthorProfileRow | null>
```

`AuthorProfileSection` must allow editing `name`, `preferred_genres`, `writing_style`, `common_phrases`, `favorite_themes`, `forbidden_words`, `pov_preference`, `pace_preference`, and `notes`. It is embedded inside `/knowledge-base` under the `作者档案` section; do not add a separate top-level route.

- [ ] **Step B2.3: Inject Author Profile into Writer Agent**

Modify the writing path so the system prompt appends `buildAuthorProfilePromptSection(activeProfile)` when a profile is selected/default. If no profile exists, do not fail generation.

- [ ] **Step B2.4: Verify Sprint B**

```powershell
npm test -- src/core/author-os/author-profile-prompt.test.ts
npx tsc -b --noEmit
cargo check --manifest-path "C:\Users\69058\Desktop\project\自研小说软件\novel-app\src-tauri\Cargo.toml"
```

Expected: PASS.

---

# Sprint C — Inspiration Panel v1

## User Journeys

1. As an author, while editing I can see 3-5 related knowledge items in the right panel.
2. As an author, I can distinguish book-owned reminders from external inspiration.
3. As an author, quote policy controls whether direct insert is offered.

## Sprint C Boundary

Sprint C implements a lightweight retrieval DTO and grouped display. It does **not** implement full 60/25/15 scoreBreakdown, BM25, rerank, or trace; those belong to Sprint E.

## Task C1: Add Lightweight Inspiration Retrieval

**Files:**
- Create: `novel-app/src/core/knowledge-base/inspiration-v1.ts`
- Test: `novel-app/src/core/knowledge-base/inspiration-v1.test.ts`

- [ ] **Step C1.1: Write failing retrieval test**

```typescript
import { describe, expect, it } from 'vitest'
import type { KnowledgeItemRow } from './types'
import { getInspirationV1Candidates } from './inspiration-v1'

function item(id: string, library: KnowledgeItemRow['library_type'], content: string): KnowledgeItemRow {
  return {
    id,
    source_id: null,
    book_id: library === 'project' ? 'book-1' : null,
    library_type: library,
    canonical_level: library === 'project' ? 'canonical' : library === 'author' ? 'reference' : 'inspiration',
    item_type: library === 'project' ? 'summary' : library === 'author' ? 'analysis' : 'quote',
    content,
    quote_policy: library === 'external' ? 'paraphrase_recommended' : 'not_applicable',
    status: 'confirmed',
    metadata_json: '{}',
    notes: '',
    created_at: 1,
    updated_at: 1,
  }
}

describe('inspiration v1 candidates', () => {
  it('keeps project reminders before author references before external inspiration', () => {
    const result = getInspirationV1Candidates({
      items: [
        item('external-1', 'external', '雨夜离别素材'),
        item('author-1', 'author', '作者偏好短句'),
        item('project-1', 'project', '林默此时不知道真相'),
      ],
      contextText: '雨夜里，林默准备离别。',
      limit: 3,
    })

    expect(result.map((candidate) => candidate.id)).toEqual(['project-1', 'author-1', 'external-1'])
    expect(result[0].canonicalLevel).toBe('canonical')
  })
})
```

- [ ] **Step C1.2: Implement lightweight retrieval**

```typescript
import type { KnowledgeItemRow, KnowledgeSuggestedAction } from './types'
import { getAllowedSuggestionActions } from './quote-policy'

export interface InspirationV1Candidate {
  id: string
  libraryType: KnowledgeItemRow['library_type']
  canonicalLevel: KnowledgeItemRow['canonical_level']
  itemType: KnowledgeItemRow['item_type']
  content: string
  quotePolicy: KnowledgeItemRow['quote_policy']
  suggestedActions: KnowledgeSuggestedAction[]
  reason: string
}

const LIBRARY_PRIORITY: Record<KnowledgeItemRow['library_type'], number> = {
  project: 3,
  author: 2,
  external: 1,
}

function textScore(content: string, contextText: string): number {
  const uniqueChars = new Set([...contextText].filter((ch) => /[一-鿿\w]/.test(ch)))
  let score = 0
  for (const ch of uniqueChars) {
    if (content.includes(ch)) score += 1
  }
  return score
}

export function getInspirationV1Candidates(input: {
  items: readonly KnowledgeItemRow[]
  contextText: string
  limit: number
}): InspirationV1Candidate[] {
  return input.items
    .filter((item) => item.status === 'confirmed')
    .map((item) => ({ item, score: textScore(item.content, input.contextText) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => {
      const priorityDiff = LIBRARY_PRIORITY[b.item.library_type] - LIBRARY_PRIORITY[a.item.library_type]
      if (priorityDiff !== 0) return priorityDiff
      return b.score - a.score
    })
    .slice(0, input.limit)
    .map(({ item, score }) => ({
      id: item.id,
      libraryType: item.library_type,
      canonicalLevel: item.canonical_level,
      itemType: item.item_type,
      content: item.content,
      quotePolicy: item.quote_policy,
      suggestedActions: getAllowedSuggestionActions(item.quote_policy),
      reason: `基础匹配命中 ${score} 个上下文字符`,
    }))
}
```

- [ ] **Step C1.3: Run tests**

```powershell
npm test -- src/core/knowledge-base/inspiration-v1.test.ts
```

Expected: PASS.

## Task C2: Add Inspiration Right Panel Tab

**Files:**
- Create: `novel-app/src/modules/editor/InspirationPanel.tsx`
- Modify: `novel-app/src/modules/editor/store.ts`
- Modify: `novel-app/src/app/components/RightPanel.tsx`

- [ ] **Step C2.1: Extend editor store union**

Change `rightPanelTab` union to include `inspiration`:

```typescript
rightPanelTab: 'outline' | 'inspiration' | 'character' | 'timeline' | 'knowledge' | 'versions' | 'audit' | 'context' | 'constraints'
```

Update `setRightPanelTab` with the same union.

- [ ] **Step C2.2: Add `InspirationPanel`**

The panel must read an `EditorContextSnapshot` from the data wiring introduced in Patch M. It should not require unavailable props directly from `RightPanel`. It must use `bookId`, `chapterId`, and `currentText` from the snapshot, call `listKnowledgeItems`, call `getInspirationV1Candidates`, and render grouped badges:

- `canonical` → “本书提醒”
- `reference` → “作者风格”
- `inspiration` → “外部灵感”

- [ ] **Step C2.3: Wire `RightPanel` tab**

Add tab:

```typescript
{ key: 'inspiration' as const, label: '灵感', icon: Sparkles }
```

Render `InspirationPanel` when active.

- [ ] **Step C2.4: Verify Sprint C**

```powershell
npm test -- src/core/knowledge-base/inspiration-v1.test.ts
npx tsc -b --noEmit
npm run lint
```

Expected: PASS.

---

# Sprint D — Author Memory

## User Journeys

1. As an author, I can analyze my own chapters into a versioned style memory.
2. As an author, I can switch the active memory version.
3. As the system, only one active version may exist per profile.

## Task D1: Add Author Memory Analysis Helper

**Files:**
- Create: `novel-app/src/core/author-os/author-memory-types.ts`
- Create: `novel-app/src/core/author-os/author-memory-analysis.ts`
- Test: `novel-app/src/core/author-os/author-memory-analysis.test.ts`

- [ ] **Step D1.1: Write failing analysis test**

```typescript
import { describe, expect, it } from 'vitest'
import { analyzeAuthorMemoryFromTexts } from './author-memory-analysis'

describe('author memory analysis', () => {
  it('creates a version fingerprint from chapter samples', () => {
    const result = analyzeAuthorMemoryFromTexts({
      profileId: 'profile-1',
      versionName: '最近章节风格',
      texts: ['林默停下来。雨还在下。', '“你知道吗？”她问。\n没人回答。'],
      analysisScope: '最近 2 章',
    })

    expect(result.profile_id).toBe('profile-1')
    expect(result.version_name).toBe('最近章节风格')
    expect(result.status).toBe('experimental')
    expect(result.sample_word_count).toBeGreaterThan(0)
    expect(result.fingerprint_json).toContain('avgSentenceLength')
  })
})
```

- [ ] **Step D1.2: Implement analysis helper**

Use existing `extractVoiceProfile` from `src/core/style/voice-profile.ts`. New auto analyses default to `experimental`; first-active promotion happens through explicit user action.

```typescript
import { extractVoiceProfile } from '@/core/style/voice-profile'
import type { AuthorMemoryVersionDraft } from './author-memory-types'

export function analyzeAuthorMemoryFromTexts(input: {
  profileId: string
  versionName: string
  texts: string[]
  analysisScope: string
}): AuthorMemoryVersionDraft {
  const combined = input.texts.join('\n\n')
  const profile = extractVoiceProfile(combined, input.versionName)
  return {
    profile_id: input.profileId,
    version_name: input.versionName,
    status: 'experimental',
    analysis_scope: input.analysisScope,
    sample_word_count: combined.length,
    avg_sentence_length: profile.fingerprint.avgSentenceLength,
    sentence_length_variance: profile.fingerprint.sentenceLengthVariance,
    dialogue_ratio: profile.fingerprint.dialogueRatio,
    top_words: JSON.stringify(profile.fingerprint.topWords),
    top_phrases: '[]',
    rhythm_pattern: profile.fingerprint.rhythmPattern,
    punctuation_density: profile.fingerprint.punctuationDensity,
    paragraph_avg_length: 0,
    scene_transition_style: '',
    chapter_opening_patterns: '[]',
    chapter_ending_patterns: '[]',
    fingerprint_json: JSON.stringify(profile.fingerprint),
  }
}
```

- [ ] **Step D1.3: Run tests**

```powershell
npm test -- src/core/author-os/author-memory-analysis.test.ts
```

Expected: PASS.

## Task D2: Add Author Memory Persistence with Active Unique Constraint

**Files:**
- Modify: `novel-app/src-tauri/src/author_os.rs`
- Modify: `novel-app/src-tauri/src/db.rs`
- Create: `novel-app/src/core/db/author-memory-repository.ts`
- Create: `novel-app/src/modules/author-profile/AuthorMemoryPanel.tsx`

- [ ] **Step D2.1: Add migration v5**

In `author_os.rs`, add `author_memory_versions`, `author_memory_snapshots`, and partial unique index:

```sql
CREATE UNIQUE INDEX IF NOT EXISTS uq_author_memory_active
  ON author_memory_versions(profile_id)
  WHERE status = 'active';
```

- [ ] **Step D2.2: Add active switch transaction**

Implement command `set_author_memory_active(profile_id, version_id)` using one transaction:

```sql
UPDATE author_memory_versions
SET status = 'archived', updated_at = ?1
WHERE profile_id = ?2 AND status = 'active' AND id != ?3;

UPDATE author_memory_versions
SET status = 'active', updated_at = ?1
WHERE profile_id = ?2 AND id = ?3;
```

The partial unique index must remain the final guard.

- [ ] **Step D2.3: Verify D**

```powershell
cargo test --manifest-path "C:\Users\69058\Desktop\project\自研小说软件\novel-app\src-tauri\Cargo.toml" author_memory
npm test -- src/core/author-os/author-memory-analysis.test.ts
npx tsc -b --noEmit
```

Expected: PASS.

---

# Sprint E — Retrieval Ranking

## User Journeys

1. As an author, recommendations are explainable with score breakdown and trace.
2. As an author, book facts outrank author style and external materials.
3. As the system, conflicting external material is blocked or downranked.

## Task E1: Add Frozen KnowledgeCandidate Contract

**Files:**
- Create: `novel-app/src/core/knowledge-base/knowledge-candidate.ts`
- Test: `novel-app/src/core/knowledge-base/knowledge-candidate.test.ts`

- [ ] **Step E1.1: Write contract test**

```typescript
import { describe, expect, it } from 'vitest'
import { mapItemToKnowledgeCandidate } from './knowledge-candidate'
import type { KnowledgeItemRow } from './types'

const item: KnowledgeItemRow = {
  id: 'item-1',
  source_id: 'source-1',
  book_id: null,
  library_type: 'external',
  canonical_level: 'inspiration',
  item_type: 'quote',
  content: '雨夜素材',
  quote_policy: 'paraphrase_recommended',
  status: 'confirmed',
  metadata_json: '{}',
  notes: '',
  created_at: 1,
  updated_at: 1,
}

describe('KnowledgeCandidate contract', () => {
  it('maps a knowledge item into frozen candidate fields', () => {
    const candidate = mapItemToKnowledgeCandidate(item, {
      score: 0.42,
      reason: '标签匹配',
      traceSource: 'tag',
    })

    expect(candidate).toMatchObject({
      id: 'item-1',
      libraryType: 'external',
      canonicalLevel: 'inspiration',
      itemType: 'quote',
      score: 0.42,
      quotePolicy: 'paraphrase_recommended',
      suggestedAction: 'paraphrase',
    })
    expect(candidate.scoreBreakdown.externalInspiration).toBeGreaterThan(0)
    expect(candidate.trace?.retrievalSource).toBe('tag')
  })
})
```

- [ ] **Step E1.2: Implement contract mapping**

Create `knowledge-candidate.ts` with interface exactly matching v6.2, including `canonicalLevel`, `scoreBreakdown`, `conflictFlags`, `quotePolicy`, `suggestedAction`, and `trace`.

## Task E2: Implement Ranking and BM25

**Files:**
- Create: `novel-app/src/core/knowledge-base/bm25.ts`
- Create: `novel-app/src/core/knowledge-base/retrieval-ranking.ts`
- Test: `novel-app/src/core/knowledge-base/retrieval-ranking.test.ts`

- [ ] **Step E2.1: Write ranking test**

```typescript
import { describe, expect, it } from 'vitest'
import { rankKnowledgeCandidates } from './retrieval-ranking'
import type { KnowledgeCandidate } from './knowledge-candidate'

function candidate(id: string, libraryType: KnowledgeCandidate['libraryType'], score: number): KnowledgeCandidate {
  return {
    id,
    libraryType,
    canonicalLevel: libraryType === 'project' ? 'canonical' : libraryType === 'author' ? 'reference' : 'inspiration',
    itemType: libraryType === 'external' ? 'quote' : 'analysis',
    content: id,
    score,
    scoreBreakdown: {
      projectRelevance: libraryType === 'project' ? score : 0,
      authorStyleFit: libraryType === 'author' ? score : 0,
      externalInspiration: libraryType === 'external' ? score : 0,
    },
    reason: 'test',
    conflictFlags: [],
    quotePolicy: libraryType === 'external' ? 'paraphrase_recommended' : 'not_applicable',
    suggestedAction: libraryType === 'external' ? 'paraphrase' : 'show_reminder',
  }
}

describe('retrieval ranking', () => {
  it('keeps project candidates above author and external when scores are close', () => {
    const ranked = rankKnowledgeCandidates([
      candidate('external', 'external', 0.95),
      candidate('author', 'author', 0.90),
      candidate('project', 'project', 0.80),
    ])

    expect(ranked.map((item) => item.id)).toEqual(['project', 'author', 'external'])
  })
})
```

- [ ] **Step E2.2: Implement ranking**

Use deterministic weights:

```typescript
const LAYER_WEIGHT = {
  project: 0.60,
  author: 0.25,
  external: 0.15,
} as const
```

Final sort key is `layerWeight + candidate.score * 0.01`, which preserves Project > Author > External unless a later explicit conflict filter removes candidates.

- [ ] **Step E2.3: Verify Sprint E**

```powershell
npm test -- src/core/knowledge-base/knowledge-candidate.test.ts src/core/knowledge-base/retrieval-ranking.test.ts
npx tsc -b --noEmit
npm run lint
```

Expected: PASS.

---

# Sprint F — Writing Cockpit

## User Journeys

1. As an author, the right panel defaults to cockpit state for the current chapter.
2. As an author, I can see active characters, location/time, active hooks, word count, recommendation count, and conflicts.
3. As an author, I can collapse/expand the cockpit without losing writing context.

## Task F1: Add Cockpit Aggregator

**Files:**
- Create: `novel-app/src/core/cockpit/cockpit-types.ts`
- Create: `novel-app/src/core/cockpit/cockpit-aggregator.ts`
- Test: `novel-app/src/core/cockpit/cockpit-aggregator.test.ts`

- [ ] **Step F1.1: Write aggregator test**

```typescript
import { describe, expect, it } from 'vitest'
import { buildCockpitState } from './cockpit-aggregator'

describe('cockpit aggregator', () => {
  it('builds a compact cockpit state from existing data sources', () => {
    const state = buildCockpitState({
      chapterTitle: '旧城区的雨',
      chapterNumber: 23,
      wordCount: 2860,
      targetWordRange: [3000, 4000],
      facts: [
        { subject: '林默', predicate: '位于', object: '旧城区', valid_from_chapter: 20, valid_until_chapter: null },
      ],
      hooks: [
        { title: '黑色药片', status: 'active', plantedChapter: 5 },
      ],
      recommendationCount: 5,
      conflictCount: 0,
      automationLevel: 'Lv1 AI 建议',
    })

    expect(state.chapter.title).toBe('旧城区的雨')
    expect(state.wordProgress.current).toBe(2860)
    expect(state.activeHooks[0].title).toBe('黑色药片')
    expect(state.recommendationCount).toBe(5)
  })
})
```

- [ ] **Step F1.2: Implement aggregator**

Create pure DTOs and an immutable `buildCockpitState` function. Do not add a cockpit table; aggregate from existing data.

- [ ] **Step F1.3: Run test**

```powershell
npm test -- src/core/cockpit/cockpit-aggregator.test.ts
```

Expected: PASS.

## Task F2: Add Cockpit Panel and Right Panel Order

**Files:**
- Create: `novel-app/src/modules/editor/WritingCockpitPanel.tsx`
- Modify: `novel-app/src/modules/editor/store.ts`
- Modify: `novel-app/src/app/components/RightPanel.tsx`

- [ ] **Step F2.1: Update store default**

Change default right panel tab:

```typescript
rightPanelTab: 'cockpit'
```

Union:

```typescript
'cockpit' | 'outline' | 'inspiration' | 'versions' | 'audit' | 'context' | 'constraints' | 'character' | 'timeline' | 'knowledge'
```

- [ ] **Step F2.2: Update RightPanel tab order**

Set visible default order to:

```typescript
const TABS = [
  { key: 'cockpit' as const, label: '驾驶舱', icon: Gauge },
  { key: 'outline' as const, label: '大纲', icon: Layers },
  { key: 'inspiration' as const, label: '灵感', icon: Sparkles },
  { key: 'audit' as const, label: '审稿', icon: BarChart3 },
  { key: 'versions' as const, label: '版本', icon: FileText },
]
```

Keep old character/timeline/knowledge/context/constraints panels accessible only if project owner explicitly wants them retained in UI. The v6.2 frozen order is cockpit, outline, inspiration, audit, versions.

- [ ] **Step F2.3: Verify Sprint F**

```powershell
npm test -- src/core/cockpit/cockpit-aggregator.test.ts
npx tsc -b --noEmit
npm run lint
```

Expected: PASS.

---

# Final Verification After Sprint A-F

Run from `novel-app` unless a command path says otherwise:

```powershell
npm test
npx tsc -b --noEmit
npm run lint
cargo check --manifest-path "C:\Users\69058\Desktop\project\自研小说软件\novel-app\src-tauri\Cargo.toml"
cargo test --manifest-path "C:\Users\69058\Desktop\project\自研小说软件\novel-app\src-tauri\Cargo.toml"
```

Expected:

- Vitest passes.
- TypeScript passes with no errors.
- ESLint passes with no warnings.
- Rust `cargo check` passes.
- Rust tests pass.

# Plan Self-Review

## Spec Coverage

- Sprint A requirements map to Tasks A1-A5: sources, tags, manual items, paste import, list/search/filter, quote policy.
- Sprint B requirements map to Tasks B1-B2: author profile, repository, page, Writer injection.
- Sprint C requirements map to Tasks C1-C2: editor context to right-panel suggestions, project/author/external grouping, quote policy action control.
- Sprint D requirements map to Tasks D1-D2: versioned memory, snapshots, active uniqueness, Writer/Auditor active-version rule.
- Sprint E requirements map to Tasks E1-E2: KnowledgeCandidate, canonicalLevel, ranking, scoreBreakdown/trace foundation.
- Sprint F requirements map to Tasks F1-F2: cockpit aggregator, default right-panel cockpit, compact/expanded UI foundation.

## Placeholder Scan

This plan intentionally does not include `TBD`, `TODO`, or open-ended feature expansion. Steps that defer scope name the exact sprint where the work belongs.

## Type Consistency

- `canonical_level` in database/rows maps to `canonicalLevel` in `KnowledgeCandidate`.
- `knowledge_items.status` uses only `proposal | pending | confirmed | archived`.
- `Author Memory` status uses only `active | archived | experimental`.
- `quote_policy` uses only `direct_allowed | paraphrase_recommended | direct_forbidden | not_applicable`.

## Risk Controls

- Browser fallback repositories must be immutable and defensive-copy results.
- Rust migrations must be idempotent.
- Author Memory active switch must be transactional and protected by partial unique index.
- Sprint C does not implement Sprint E ranking prematurely.
- Sprint F does not add a cockpit persistence table.
