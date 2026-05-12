# 009 — Generations 3 and 4 reuse the gen 2 code path

- **Status:** Accepted
- **Date:** ~2024 (gen 3), 2025 (gen 4)

## Context

Shelly has released two new generations since gen 2 — gen 3 (2024) and gen 4 (2025). Both retain the same JSON-RPC protocol shape as gen 2: `POST /rpc` with `{id, method, params}`. The differences are in hardware (more sensors, MTR-grade power metering, new components like the BLU Pill) rather than in the wire protocol.

Three options:

- (A) Add `shelly-gen3` and `shelly-gen4` node types per [ADR-001](001-three-node-types-per-generation.md).
- (B) Reuse the existing `shelly-gen2` node and merge gen 3/4 into its dropdown.
- (C) A hybrid: per-generation categories in the catalog and UI, but a shared underlying node type.

## Decision

**(C).** Gen 3 and gen 4 devices live in the catalog with `gen: "3"` and `gen: "4"`, are tagged separately in `gen2DeviceTypes`, but are handled at runtime by the same `shelly-gen2` node type with the same input parsers and same RPC client.

Concretely:

- [`shelly/lib/shelly.js`](../../../shelly/lib/shelly.js) (`shellyPing` / `tryCheckDeviceType`) accepts `gen: 2`, `gen: 3`, and `gen: 4` and maps all three to `requiredNodeType = 'shelly-gen2'`.
- [`shelly/99-shelly.js`](../../../shelly/99-shelly.js) concatenates gen 2, 3, and 4 catalogs in the admin route `getidevicetypesgen2`.
- The editor dropdown groups devices by generation header but selects into a single node-type.

## Consequences

**Positive:**

- Adding gen 3 / gen 4 support cost almost no new code — mostly catalog entries.
- A user upgrading their hardware from a Plus 1 (gen 2) to a 1 Gen 3 doesn't have to swap node types in their flow; they just change the device type dropdown.
- One implementation to maintain for the JSON-RPC transport, auth, script lifecycle, etc.

**Negative:**

- The naming is now misleading: `shelly-gen2` is really `shelly-gen2-or-higher`. Renaming would break every existing flow.
- If gen 5 introduces a protocol break, this shortcut ends: a new node type would be needed and the catalog tagging convention would need rethinking.
- Some Shelly Pro / Wall Display devices have gen-specific endpoints not yet exposed by this package (component-specific RPC methods). The generic `inputParserGeneric2` handles any RPC call the user types, but it doesn't validate that the device supports it — failures surface at runtime.

**Locks us into:**

- The "all JSON-RPC Shelly hardware is one node type" model. If Shelly ever forks the protocol (e.g., a v2 envelope with structural changes), we'd either need a new node type or runtime branching inside `shelly-gen2`.
