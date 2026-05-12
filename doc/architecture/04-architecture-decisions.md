# 04 · Architecture Decisions

This chapter is the **index** for the project's Architecture Decision Records (ADRs). Each ADR captures one significant decision: the context that forced it, what was decided, and what consequences followed.

The records are stored individually in [`adrs/`](adrs/). They use a lightweight Nygard-style format (Title / Status / Context / Decision / Consequences). Numbering is chronological-ish — earlier numbers reflect older decisions, but the dates aren't always recoverable from git history because some decisions predate this documentation effort.

## Index

| # | Title | Status |
|---:|---|---|
| [001](adrs/001-three-node-types-per-generation.md) | Three node-type pairs, one per protocol generation | Accepted |
| [002](adrs/002-config-driven-device-catalog.md) | Device catalog as data, not code | Accepted |
| [003](adrs/003-polling-vs-callback-modes.md) | Two operating modes: polling and callback | Accepted |
| [004](adrs/004-gen2-scripts-vs-gen1-webhooks.md) | Callbacks via uploaded scripts (gen 2+) vs. built-in webhooks (gen 1) | Accepted |
| [005](adrs/005-cloud-rate-limited-axios.md) | Cloud node uses a shared rate-limited axios instance | Accepted |
| [006](adrs/006-blu-via-gen2-gateway.md) | BLU devices addressed through a gen 2+ gateway, not directly | Accepted |
| [007](adrs/007-server-config-node-owns-listener.md) | The fastify callback listener lives on the server config node | Accepted |
| [008](adrs/008-digest-auth-401-retry.md) | HTTP Digest auth (gen 2+) handled by transparent 401-retry | Accepted |
| [009](adrs/009-gen3-gen4-share-gen2-codepath.md) | Generations 3 and 4 reuse the gen 2 code path | Accepted |
| [010](adrs/010-vendored-blu-scanner-script.md) | The BLU scanner script is vendored from `ALLTERCO/shelly-script-examples` | Accepted |

## Reading order

If you're new to the codebase: 001 → 002 → 003 → 004 first. Those four explain _why the source tree looks the way it does_ and account for most of the day-to-day surface.

If you're touching auth or transport: 008, 005.

If you're working on BLU or callback mode: 006, 007, 004, 010.

## How to add a new ADR

1. Pick the next free number (currently 011).
2. Copy an existing record as a template — they're all short and uniform.
3. Update the status field on any record this one supersedes.
4. Add a row to the table above.
5. Commit with a message like `docs(adr): NNN <title>`.

ADRs are append-only: never edit a past decision in place. To revise, write a new ADR and mark the old one **Superseded by NNN**.
