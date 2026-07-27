# 001 — Three node-type pairs, one per protocol generation

- **Status:** Accepted
- **Date:** ~2020 (predates this documentation; reconstructed from git history)

## Context

Shelly hardware has evolved through fundamentally different control protocols:

- **Gen 1** speaks REST with key=value query strings (`GET /relay/0?turn=on`).
- **Gen 2/3/4** speaks JSON-RPC (`POST /rpc` with `{id, method, params}`).
- **Cloud** is a different beast entirely — server-side REST with `auth_key` body, rate-limited.

These three are not minor variations. They differ in URL shape, body shape, authentication, error format, supported endpoints, and even what "set a relay" looks like as a primitive.

The package could have:

- (A) One unified `shelly` node that switches internally on `device.gen`.
- (B) Three separate device-node types (`shelly-gen1`, `shelly-gen2`, `shelly-cloud`).

## Decision

Three separate device-node types, each with its own server config-node companion (six registered types total). The pairing is `<protocol>-node` + `<protocol>-server`.

## Consequences

**Positive:**

- Editor UI is cleaner: the user picks "gen1" or "gen2" up front, and the device-type dropdown is then scoped sensibly.
- Each implementation is self-contained — touching gen 2 RPC handling cannot break gen 1 REST handling.
- Per-generation credential schemas: gen 1 uses Basic auth, gen 2 uses Digest, cloud uses an `authkey`. Registering them separately lets each node declare its own `credentials` block.

**Negative:**

- Three places to fix the same logical bug if it crosses generations (e.g., the close-race fix in 11.10.0 had to be applied in both `gen1-node.js` and `gen2-node.js`).
- Initial setup confusion: users coming from the Shelly app don't realise their "Plus 1" is gen 2 and not gen 1.
- Some near-duplication in lifecycle scaffolding (constructor pattern, close handler, IIFE).

**Locks us into:**

- Adding a fifth generation will likely require a fourth node type, not just a config entry — unless it's strictly RPC-compatible with gen 2 (see [ADR-009](009-gen3-gen4-share-gen2-codepath.md)).
- Any consolidation toward a unified node type would be a breaking change for every user's existing flows.
