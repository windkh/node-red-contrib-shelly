# 012 — Node files hold glue only; a node object is mocked, never the RED runtime

- **Status:** Accepted
- **Date:** 2026-08-19

## Context

A node file exports `function (RED) { … }`, so everything inside that closure is unreachable
without a RED object. In `cloud-node.js` that closure held the whole cloud transport — the
shared rate-limited axios instance, `getRequestTimeout`, and both request wrappers — none of
which ever touched `RED`. `RED` appeared at exactly two of its 141 lines.

Phase 6 solved the reachability problem with a **fake RED runtime**
(`test-helpers/fake-red.js`, ~78 lines: `createNode`, `getNode`, `registerType`, `httpAdmin`,
`log`, plus captured `status` / `warn` / `error` / `send`). It worked — `cloud-node.js` went
from 0% to 95.7% lines — but it treated the symptom. The transport was still trapped in a
closure it had no reason to be in, and the harness existed to reach around that.

Two further signals came out of it:

- The same harness was promoted into `node-red-standards` and synced into six repos. Exactly
  one test in one repo ever used it, and that repo kept its own diverged copy rather than the
  shipped one. A RED stand-in is not reusable across repos, because what a test needs from it
  is the _node's_ surface, which is repo-specific.
- The shipped version could not drive a node written to the recommended
  `on('input', (msg, send, done) => …)` signature: its `send(msg)` called the handler with one
  argument, so `done` was `undefined`.

`lib/shelly.js` had already shown the alternative in the same repo: it exports its lifecycle
functions directly and `lifecycle.test.js` drives them with `test-helpers/fake-node.js`, a
plain node-shaped object. No RED anywhere.

## Decision

**RED-free code moves out of the node closure; what stays is glue, and tests mock the node
object rather than the RED runtime.**

1. `cloud/transport.js` holds the shared `cloudAxios` instance and both request wrappers.
   Module level now in fact as well as in intent (ADR-005 always described it as such).
2. `cloud/dispatch.js` holds the input handler as `handleInput(node, msg)` — it takes the node
   because everything it touches is the node's own surface (`server`, `status`, `send`,
   `error`), never `RED`.
3. `cloud-node.js` is 30 lines of wiring: `createNode`, `getNode`, clear the status, register
   the two handlers.
4. Tests mock the **node**, not the runtime: `test-helpers/fake-node.js`, extended with
   `server` and with `error(message, msg)` so the catch-node contract stays assertable.
5. `test-helpers/fake-red.js` is deleted.
6. The wiring in `cloud-node.js` gets a small **local** RED stub inside
   `test/unit/cloud-node.test.js`. Deliberately local and deliberately minimal: a shared
   harness invites tests to reach business logic through it, which is how the transport ended
   up in the closure. It asserts only that the wiring is in place.

## Consequences

**Positive:**

- The transport and dispatch layers are testable with no runtime stand-in at all: 98.9% lines
  across `shelly/nodes/cloud/`.
- Every metric improved against the pre-refactor baseline — lines 48.81 → 49.24, branches
  91.05 → 91.83, functions 85.71 → 85.93 — and `cloud-node.js` reached 100%, because 30 lines
  of glue are fully coverable where 141 lines were not.
- Point 6 closes a gap the extraction opened: without it nothing loaded `cloud-node.js` at all,
  so a wrong `require` path would have passed CI and failed at Node-RED startup.
- `gen1-node.js` and `gen2-node.js` (794 lines each, 0%) now have a worked example to follow
  that does not require inventing a runtime.

**Negative:**

- Three files where there was one, and one more hop to read when following a cloud request.
- The glue in `cloud-node.js` is only covered by an assertion that it is wired, not that it
  behaves. That is the honest limit of what 30 lines of `createNode` / `getNode` can be
  asserted to do.

**Locks us into:**

- A node file may not grow logic again. Anything that does not need `RED` belongs beside it in
  a plain module — otherwise the next reachability problem invites the next fake runtime.
