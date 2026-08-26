# Context Gears

Working prototype for paragraph-level conversation branches.

Each paragraph, equation, table, or schematic is an addressable token block. Its small gear moves the ordinary chat composer directly beneath that block, so the user can continue the conversation at the exact point being discussed. The human only writes the message; categorization and status metadata are inferred and stored behind the interface.

Revisions are append-only. The newest content remains open and readable in the main conversation. Earlier wording and older branch turns are never wiped: arrow expanders fold them out of the way until the reader wants their full history.

## Context graph

```text
conversation → message → block → inline branch → newest revision
                                      └─ folded earlier history
```

The prototype uses stable block IDs and D1-backed context-entry history. A revision can become the displayed content while retaining the earlier block and discussion in collapsible history.

## Integration path

This is not an official ChatGPT plugin. It demonstrates the product and data model a host chat application could integrate:

1. Split assistant output into stable semantic blocks.
2. Render a gear beside every block.
3. Relocate the existing composer beneath the selected block and send its stable ID with surrounding context.
4. Infer record type, status, and category without asking the human to fill in database fields.
5. Store every contribution as an append-only record.
6. Keep the newest revision visible while folding earlier wording and older turns behind arrow controls.
7. Export categorized history for research, engineering, or another AI system.

## Current prototype

- Familiar responsive chat layout
- Paragraph-level gear controls that relocate the composer inline
- Newest content visible with foldable earlier wording and branch turns
- Automatic record-type, status, and category classification
- Durable D1 history
- JSON history export

## Next steps

- Stable selection IDs for equations, tables, and partial paragraphs
- Original-versus-revision diff view
- Search and category filters
- Conflict detection for simultaneous revisions
- Import of exported histories
- Host-application adapter and permissions boundary
