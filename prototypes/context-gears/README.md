# Context Gears

Working prototype for paragraph-level conversation branches.

Each paragraph, equation, table, or schematic is an addressable token block. Its gear opens a focused thread without losing the reader's location. A contribution can be recorded as a note, correction, expansion, or replacement revision and categorized as accepted, disputed, experimental, unresolved, or revised.

## Context graph

```text
conversation → message → block → focused thread → token edits → accepted revision
```

The prototype uses stable block IDs and D1-backed token-edit history. A revision can replace the displayed paragraph while retaining the earlier block and discussion in history.

## Integration path

This is not an official ChatGPT plugin. It demonstrates the product and data model a host chat application could integrate:

1. Split assistant output into stable semantic blocks.
2. Render a gear beside every block.
3. Send the selected block ID and surrounding context to a focused conversation.
4. Store edits as append-only records.
5. Promote an accepted revision into the primary response while retaining provenance.
6. Export categorized history for research, engineering, or another AI system.

## Current prototype

- Responsive document and focused-thread layout
- Paragraph-level gear controls
- Notes, corrections, expansions, and direct revisions
- Status and category classification
- Durable D1 history
- JSON history export
- Mobile side-sheet interaction

## Next steps

- Stable selection IDs for equations, tables, and partial paragraphs
- Thread replies and parent-child nesting
- Original-versus-revision diff view
- Search and category filters
- Conflict detection for simultaneous revisions
- Import of exported histories
- Host-application adapter and permissions boundary
