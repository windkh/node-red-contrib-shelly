# Architecture Decision Records

This folder holds one Markdown file per architectural decision. See [`../04-architecture-decisions.md`](../04-architecture-decisions.md) for the indexed table of all ADRs in reading order.

## Format

Each ADR follows the Nygard-style structure:

```markdown
# NNN — Title

- **Status:** Accepted / Proposed / Superseded by [NNN](NNN-...md) / Deprecated
- **Date:** YYYY-MM-DD

## Context
Why this decision came up. What constraints were in play?

## Decision
The choice that was made. Single, declarative sentence ideally.

## Consequences
Positive, negative, and neutral fallout of the choice. What does this lock us into?
```

## Conventions

- Filenames: `NNN-kebab-case-title.md` where `NNN` is a zero-padded sequence number starting at `001`.
- Numbers are never reused, even if the ADR is later marked Superseded.
- The **Status** line is the single source of truth for whether a record is still active. Don't delete deprecated records — superseding ones reference them.
- Keep records short. If an ADR runs over ~80 lines, ask whether it's really one decision.
