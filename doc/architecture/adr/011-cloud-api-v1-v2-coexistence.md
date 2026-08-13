# 011 — Cloud node supports API v1 and v2 side by side

- **Status:** Accepted
- **Date:** 2026-08-13

## Context

The cloud node was written against the [v1 Cloud Control API](https://shelly-api-docs.shelly.cloud/cloud-control-api/communication), which Shelly now marks **deprecated and to be removed in the near future**. The replacement is [Communication v2.0-beta](https://shelly-api-docs.shelly.cloud/cloud-control-api/communication-v2).

v2 is not a compatible superset. Every command differs:

| v1                                    | v2                                   |
| ------------------------------------- | ------------------------------------ |
| `type: "relay"`, `turn: "on"`         | `type: "switch"`, `on: true`         |
| `type: "roller"`, `direction` / `pos` | `type: "cover"`, `position`          |
| `type: "light"`, `turn`               | `type: "light"`, `on`                |
| `type: "relays"`, `devices`           | `type: "groups"`, `{ ids, command }` |
| `type: "status"`, one device          | `type: "get"`, up to 10 devices      |
| `type: "all_status"`                  | _no equivalent_                      |

The transport differs too: v1 posts a form-urlencoded body carrying `auth_key`, v2 puts `auth_key` in the query string and sends JSON. And reads change shape on the way back — v1 returned the status object directly, v2 returns a list of `{ id, type, code, gen, online, status, settings }`, so even a perfectly translated request feeds different data to every downstream node.

A straight replacement would therefore break every existing cloud flow, silently, on a package update.

## Decision

**Support both versions, selected on the cloud server config node.**

1. The version is a property of the **connection**, not of each message. The two payload vocabularies never meet, so `type` values may overlap — which they do: `light` exists in both with different fields.
2. **New config nodes default to v2.** The default lives in the editor's `defaults` block in `99-shelly.html`.
3. **The runtime reads an absent value as v1.** A config node saved before this option existed carries no version property at all, and absent can only mean "predates the option". See [`shelly/nodes/cloud/api-version.js`](../../../shelly/nodes/cloud/api-version.js).
4. Request building lives in two pure modules, [`cloud/parsers/v1.js`](../../../shelly/nodes/cloud/parsers/v1.js) and [`cloud/parsers/v2.js`](../../../shelly/nodes/cloud/parsers/v2.js), each returning a route plus a body, or `undefined` when the type is not one of its commands.
5. An unrecognised type is **reported**, naming the configured version. It used to be silently forwarded.

Point 3 is the load-bearing one. Reading absent as v2 — the naive reading of "v2 is the default" — would switch the API under every deployed flow on upgrade, and their payloads do not port.

## Consequences

**Positive:**

- Updating the package cannot change the behaviour of an existing flow.
- New users get the supported API without having to know there is a choice.
- v1 can be deleted in one commit when Shelly finally removes it, without touching v2.
- Both request builders are pure functions and unit-tested without a Node-RED runtime; the v1 tests pin the wire format that existed before the extraction, so the refactor is verifiable.
- v2 failures now carry the cloud's own reason (`DEVICE_OFFLINE`, `BAD_REQUEST`, …) rather than a bare status code.

**Negative:**

- Two vocabularies exist for the same devices, which is a documentation burden. Mitigated by [the migration guide](../../migration/cloud-api-v1-to-v2.md) and by the error message naming the configured version.
- Opening an existing config node in the editor shows the `defaults` value, v2. Deploying after that writes v2 and moves the connection, which is an opt-in but a quiet one — the dropdown is visible at that moment, and the node help says switching is a migration.
- `all_status` has no v2 equivalent, so some flows cannot move at all until Shelly provides one.
- v2 is labelled beta and may change under us.

**Rejected alternatives:**

- **Replace v1 outright.** Breaks every existing flow; v1 still works and is still what most deployments speak.
- **Translate v1 payloads onto v2 endpoints.** The three control commands map mechanically, but reads do not: the response would have to be reshaped back into the v1 form, which is lossy, and `all_status` has nowhere to map. Left as a possible future convenience, not a substitute for keeping v1.
- **Per-message version selection.** Makes every message carry transport concerns and would force the two `light` shapes into one namespace.

**Locks us into:**

- The server config node owning the version, consistent with [ADR-007](007-server-config-node-owns-listener.md), where the server node owns shared connection state.
