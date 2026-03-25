# Changelog

## [0.2.2] - 2026-03-25

### Changed
- reuse shared diff action primitives

## [0.2.1] - 2026-03-25

### Changed
- delegate resolve-diff to core, remove ability registration

## [0.2.0] - 2026-03-24

### Added
- InsertContentAbility — positional content insertion with diff preview
- add Gutenberg editor chat sidebar powered by @extrachill/chat
- register editor.md context file via datamachine_default_context_files

### Changed
- make diff block headless: abstract core/editor into EditorContext
- remove InsertContentAbility — moved to data-machine core
- migrate all JS source to TypeScript + add README
- Initial plugin scaffold with datamachine/diff block ported from Wordsurf

## 0.1.0 — 2026-03-24

### Added
- Initial plugin scaffold following Data Machine extension pattern
- `datamachine/diff` Gutenberg block ported from Wordsurf
  - Inline diff visualization with `<ins>`/`<del>` tags
  - Accept/reject per-block review workflow
  - Three diff modes: edit (surgical text replace), write (full block replace), insert (new content)
- DiffTracker singleton for centralized diff state management
- InlineDiffManager component for applying diffs to editor blocks
- HandleAcceptAll for bulk accept/reject operations
- Backend communication via Data Machine REST API (`/datamachine/v1/editor/diff/resolve`)
- Chat continuation wired to DM `/chat/continue` endpoint
- DiffAbilities PHP class with `datamachine/resolve-diff` ability
