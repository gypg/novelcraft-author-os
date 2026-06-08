# Sprint D Task Plan — Author Memory UI / Retrieval Diagnostics / Context Budget

## Goal
Convert Sprint C backend/context capabilities into visible, controllable UI while tightening remaining direct-forbidden derived metadata hardening. Scope: Author Memory management inside `/knowledge-base`, retrieval score visualization, actual context budget diagnostics, and summary/keywords sanitization.

## Phases

### Phase 0 — PR / Branch Setup and Contract Lock
- [x] Push `feature/author-os-knowledge-base`
- [x] Ensure remote `main` exists and GitHub default branch is `main`
- [x] Create PR for Sprint A/B/C: https://github.com/gypg/novelcraft-author-os/pull/1
- [x] Create Sprint D branch `feature/author-os-sprint-d`
- [x] Confirm Sprint D depends on Sprint C knowledge-item-backed Author Memory, not new versioned memory tables
- [x] Keep Author Memory UI under existing `/knowledge-base` Author OS surface, not a new top-level route
- [x] Add explicit contract phase before UI work: safe projections / DTOs first, React panels second

### Phase 1 — Direct-forbidden redaction hardening and safe projections
- [x] Create `novel-app/src/core/knowledge-base/knowledge-redaction.ts`
- [x] Centralize safe metadata parsing, control-character stripping, summary truncation, keyword count/length limits
- [x] Add prompt/UI-safe projection helper such as `buildSafeKnowledgePreview()` with redaction state and display-safe summary/keywords
- [x] Reuse helper in `knowledge-retrieval.ts` so direct-forbidden retrieval never indexes raw content/notes
- [x] Reuse helper in `context-builder.ts` so prompt JSONL never leaks raw direct-forbidden content
- [x] Add/extend tests for redaction helper, retrieval, context-builder prompt serialization, and no raw-content leakage

### Phase 2 — Retrieval diagnostics contract / store
- [x] Define a stable retrieval diagnostics DTO with item id, library type, canonical level, quote policy, item type, redaction state, safe display title/summary/keywords, and score breakdown
- [x] Add `modules/ai-collab/context-diagnostics-store.ts` for latest `budgetReport`, retrieval diagnostics DTOs, `bookId`, `chapterId`, and timestamp
- [x] Publish diagnostics from UI/application boundary call sites after `buildWritingContext`; do not import module stores from `core`
- [x] Include stale detection when `bookId` / `chapterId` differs from current editor context
- [x] Add store/DTO tests for set/clear/stale behavior and direct-forbidden preview redaction

### Phase 3 — Actual context budget panel
- [x] Update `ContextBudgetPanel.tsx` to accept optional real `ContextBudgetReport`
- [x] Render layer totals: truth files, temporal facts, author memory, knowledge, recent summary, current tail
- [x] Preserve message-estimate fallback before first context build
- [x] Add explicit stale/no-run/empty states
- [x] Add total and warning states around 70% / 90% utilization
- [x] Add tests for real report, fallback, zero/empty, stale state, and warning thresholds

### Phase 4 — Knowledge retrieval visualization
- [x] Add `KnowledgeRetrievalPanel.tsx`
- [x] Render safe retrieval DTOs, score, bm25, library/canonical/quote/recency weights
- [x] Add quote policy and redaction badges
- [x] Ensure direct-forbidden UI never displays raw content
- [x] Wire panel into context tab after diagnostics store is available
- [x] Add focused component/view-model tests

### Phase 5 — Author Memory UI
- [ ] Add `updateAuthorMemory` and `archiveAuthorMemory` repository helpers on existing `knowledge_items` backing store
- [ ] Add `author-memory-view-model.ts` for labels/defaults/form normalization
- [ ] Add `AuthorMemorySection.tsx` with create/edit/archive/list UI
- [ ] Wire Author Memory section/tab into `KnowledgeBasePage.tsx` and store state
- [ ] Add repository and view-model tests; component tests if practical
- [ ] Do not add `author_memory_versions` / snapshots in Sprint D unless scope explicitly changes and migration/compatibility plan is written first

### Phase 6 — Validation / Review / Commit
- [ ] Run `npm --prefix novel-app run test`
- [ ] Run `npm --prefix novel-app run lint`
- [ ] Run `npm --prefix novel-app exec -- tsc -b novel-app/tsconfig.json --noEmit`
- [ ] Run Rust checks only if Rust changes
- [ ] Run code-reviewer after code changes
- [ ] Run security-reviewer for redaction/prompt-injection changes
- [ ] Commit Sprint D changes
- [ ] Push `feature/author-os-sprint-d`

## Decisions
- Sprint D starts from PR #1 head branch to keep dependent work unblocked while PR is open.
- Keep Sprint D UI inside `/knowledge-base`; do not add another top-level route.
- Sprint D uses the Sprint C knowledge-item-backed Author Memory model; do not introduce versioned memory tables in this UI/observability/hardening sprint.
- Introduce shared redaction helper and safe retrieval DTO before UI diagnostics so all consumers share the same safety invariant.
- Archive author memories by setting `status='archived'`, not deleting, for auditability.
- Publish diagnostics from application/module boundary after `buildWritingContext`; do not let `core` depend on UI stores.
- Build React panels on immutable DTO/view-model outputs rather than binding components directly to raw `KnowledgeItemRow` or prompt JSONL strings.

## Risks
- `KnowledgeBasePage.tsx` may grow too large; mitigate by extracting focused sections/components.
- Over-truncating summary/keywords may reduce retrieval quality; use deterministic but moderate limits and tests.
- Diagnostics can become stale when switching book/chapter; store `bookId` and `chapterId` with the report.
- Direct-forbidden `summary`/`keywords` ingestion must eventually guarantee these are sanitized derivatives, not raw excerpts.
- Retrieval visualization needs safe display fields beyond Sprint C's `{ id, score, scoreBreakdown }`; add DTO mapping before React work.
- Avoid dual-source Author Memory: versioned memory persistence is out of scope unless a migration/compatibility plan is added.

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
| `gh pr create` failed: remote default branch was feature branch and remote `main` did not exist | Create PR base `main` from feature branch | Pushed local `main` to origin, set GitHub default branch to `main`, retried PR creation successfully |
