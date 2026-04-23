# Data Machine Editor

Editor integration extension for [Data Machine](https://github.com/Extra-Chill/data-machine). Inline diff visualization, accept/reject review workflow, and Gutenberg editor tools for AI-powered content editing.

## What it does

When an AI agent edits post content through Data Machine, changes are presented as inline diffs inside the Gutenberg block editor. Each change shows word-level additions (`<ins>`) and removals (`<del>`) that the user can accept or reject individually.

### Diff modes

| Mode | Description |
|------|-------------|
| **edit** | Surgical text replacement within an existing block. Shows word-level changes. |
| **write** | Full block replacement. Shows before/after with word-level diff. |
| **insert** | New content added between existing blocks. |

### Review workflow

1. AI makes edits via Data Machine content abilities (`edit-post-blocks`, `replace-post-blocks`, `insert-content`)
2. Each content ability stages a pending action in `PendingActionStore` and returns a preview envelope
3. Changes appear as `datamachine/diff` blocks with inline `<ins>`/`<del>` tags
4. User reviews each change and clicks Accept or Reject
5. On resolution, `/datamachine/v1/editor/actions/resolve` delegates to core's `ResolvePendingActionAbility`, the diff wrapper is removed, and clean content remains
6. When all diffs are resolved, chat continuation fires automatically

## Architecture

```
src/
  types.ts                  # Shared TypeScript types
  globals.d.ts              # WordPress global declarations
  diff/
    index.ts                # Block registration entry point
    edit.tsx                 # Block editor component
    save.tsx                 # Returns null (server-managed content)
    DiffRenderer.ts          # Applies <ins>/<del> tags to block content
    ActionResolver.ts        # Accept/reject with DM REST API communication
    ContentUpdater.ts        # Surgical cleanup of diff tags on resolution
    FindDiffBlocks.ts        # Query utility for diff blocks in the editor
    HandleAcceptAll.ts       # Bulk accept/reject operations
    style.css                # Diff block styles
  editor/
    ActionTracker.ts         # Singleton state manager, wires to /chat/continue
    InlineDiffManager.tsx    # Applies backend diff wrappers to editor blocks

inc/
  Abilities/
    ActionResolverAbilities.php  # Editor REST bridge → core resolve-pending-action
  Blocks/
    Diff/
      block.json             # Block metadata
```

## Backend

### REST endpoint

```
POST /datamachine/v1/editor/actions/resolve
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `decision` | `'accepted' \| 'rejected'` | User's decision |
| `action_id` | `string` | The pending action identifier |
| `tool_call_id` | `string` | Originating tool call |
| `post_id` | `integer` | Post being edited |

### Hook

Fires `datamachine_editor_action_resolved` with `$decision, $action_id, $tool_call_id, $post_id` after delegating to the unified core resolver.

### Context memory

Registers editor mode guidance via the `datamachine_agent_mode_editor` filter.

## Requirements

- WordPress 6.5+
- PHP 8.2+
- [Data Machine](https://github.com/Extra-Chill/data-machine) plugin (core) — version that ships the unified `PendingActionStore` / `ResolvePendingActionAbility` lane.

## Development

```bash
npm install
npm run build       # Production build
npm run start       # Watch mode
npm run typecheck   # TypeScript type checking
```

Uses `@wordpress/scripts` with TypeScript support.

## License

GPL v2 or later
