# Sprint D Task Plan — Author Memory UI / Retrieval Diagnostics / Context Budget

## Goal
Convert Sprint C backend/context capabilities into visible, controllable UI while tightening remaining direct-forbidden derived metadata hardening. Scope: Author Memory management inside `/knowledge-base`, retrieval score visualization, actual context budget diagnostics, and summary/keywords sanitization.

## Phases

### Phase 0 — PR / Branch Setup
- [x] Push `feature/author-os-knowledge-base`
- [x] Ensure remote `main` exists and GitHub default branch is `main`
- [x] Create PR for Sprint A/B/C: https://github.com/gypg/novelcraft-author-os/pull/1
- [x] Create Sprint D branch `feature/author-os-sprint-d`

### Phase 1 — Direct-forbidden redaction hardening
- [ ] Create `novel-app/src/core/knowledge-base/knowledge-redaction.ts`
- [ ] Centralize safe metadata parsing, summary truncation, keyword count/length limits
- [ ] Reuse helper in `knowledge-retrieval.ts` so direct-forbidden retrieval never indexes raw content/notes
- [ ] Reuse helper in `context-builder.ts` so prompt JSONL never leaks raw direct-forbidden content
- [ ] Add/extend tests for redaction helper, retrieval, and context-builder prompt serialization

### Phase 2 — Author Memory UI
- [ ] Add `updateAuthorMemory` and `archiveAuthorMemory` repository helpers
- [ ] Add `author-memory-view-model.ts` for labels/defaults/form normalization
- [ ] Add `AuthorMemorySection.tsx` with create/edit/archive/list UI
- [ ] Wire Author Memory section/tab into `KnowledgeBasePage.tsx` and store state
- [ ] Add repository and view-model tests; component tests if practical

### Phase 3 — Context diagnostics transport
- [ ] Add `modules/ai-collab/context-diagnostics-store.ts`
- [ ] Publish latest `budgetReport` / `retrievedKnowledge` from UI/application boundary call sites after `buildWritingContext`
- [ ] Preserve core/module layering: `core` must not import `modules`
- [ ] Include `bookId` / `chapterId` / timestamp for stale diagnostics detection
- [ ] Add store tests for set/clear/stale behavior

### Phase 4 — Knowledge retrieval visualization
- [ ] Add `KnowledgeRetrievalPanel.tsx`
- [ ] Render retrieved item IDs, score, bm25, library/canonical/quote/recency weights
- [ ] Add quote policy and redaction badges
- [ ] Ensure direct-forbidden UI never displays raw content
- [ ] Wire panel into context tab
- [ ] Add focused component/view-model tests

### Phase 5 — Actual context budget panel
- [ ] Update `ContextBudgetPanel.tsx` to accept optional real `ContextBudgetReport`
- [ ] Render layer totals: truth files, temporal facts, author memory, knowledge, recent summary, current tail
- [ ] Preserve message-estimate fallback before first context build
- [ ] Add total and warning states around 70% / 90% utilization
- [ ] Add tests for real report, fallback, zero/empty, and warning thresholds

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
- Introduce shared redaction helper before UI diagnostics so all consumers share the same safety invariant.
- Archive author memories by setting `status='archived'`, not deleting, for auditability.
- Publish diagnostics from application/module boundary after `buildWritingContext`; do not let `core` depend on UI stores.

## Risks
- `KnowledgeBasePage.tsx` may grow too large; mitigate by extracting focused sections/components.
- Over-truncating summary/keywords may reduce retrieval quality; use deterministic but moderate limits and tests.
- Diagnostics can become stale when switching book/chapter; store `bookId` and `chapterId` with the report.
- Direct-forbidden `summary`/`keywords` ingestion must eventually guarantee these are sanitized derivatives, not raw excerpts.

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
| `gh pr create` failed: remote default branch was feature branch and remote `main` did not exist | Create PR base `main` from feature branch | Pushed local `main` to origin, set GitHub default branch to `main`, retried PR creation successfully |
