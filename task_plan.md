# Sprint C Task Plan — Author Memory / Knowledge Retrieval / Context Budget

## Goal
Implement Sprint C as a narrow, testable layer on top of Sprint A/B: author memory, retrieval-ranked knowledge context, and finer Writer context budget wiring without adding dependency bloat or changing provider assumptions.

## Phases

### Phase 0 — Repo governance
- [ ] Push `main` to remote
- [ ] Set GitHub default branch to `main`
- [ ] Keep feature branch tracking `origin/feature/author-os-knowledge-base`

### Phase 1 — Research and design
- [x] Read required project docs
- [x] Search existing repo patterns
- [x] Start subagents for architecture/TDD/research where possible
- [x] Decide build/custom vs dependency

### Phase 2 — TDD for Sprint C
- [x] Add tests for author memory wrapper
- [x] Add tests for retrieval scoring and ranking
- [x] Add tests for context-builder injection and budget truncation

### Phase 3 — Implementation
- [x] Implement Author Memory types/repository wrapper
- [x] Implement Knowledge Retrieval scoring with score breakdown
- [x] Wire retrieved author memories / knowledge into writing context
- [x] Add context metadata for budget/retrieval observability

### Phase 4 — Verification and review
- [x] Run frontend tests
- [x] Run lint
- [x] Run TypeScript build
- [x] Run Rust check/tests if Rust changed
- [x] Run code-reviewer/security-reviewer after code changes

### Phase 5 — Documentation, commit, push
- [x] Update progress.md
- [ ] Commit changes
- [ ] Push branch

## Decisions
- Reuse existing `knowledge_items` with `library_type='author'` for Author Memory instead of adding a v5 SQLite migration in this sprint.
- Build lightweight BM25/keyword retrieval in-project, reusing existing local-first data and avoiding dependency bloat.
- Treat retrieved user/authored text as data: inject through labeled sections and JSON boundaries where appropriate.

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
| Read tool pages parameter rejected empty string | Initial required-doc reads | Retried with valid `pages` value |
| Agent failed before team existed | Early subagent spawn | Created `sprint-c` team and respawned agents |
| `git push main` network reset | Repo governance Phase 0 | Defer retry after implementation/verification |
