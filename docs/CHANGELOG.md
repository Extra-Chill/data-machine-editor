# Changelog

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
