# 07 · Future Improvements

These are **feature** ideas — things the package doesn't do today but plausibly could. Each is sized roughly (S / M / L) and labelled with which user it benefits.

These are different from [Refactoring Recommendations](06-recommendations-for-refactoring.md): refactors are internal cleanups with no user-visible change; these are new capabilities. Each has a brief sketch of how it would slot into the existing architecture.

---

## F1. Outbound WebSocket transport for gen 2+ (M)

**For:** users with many devices or low-latency requirements.

**What:** Shelly gen 2+ supports an **outbound WebSocket** mode where the device opens a persistent WS connection to a configured URL and pushes status + receives RPC commands over that channel. This collapses the request/response round trip (no polling, no per-request digest challenge).

**Sketch:** add a third operating mode (`websocket`) alongside polling and callback. The server config node would host a fastify WS endpoint. Device-side configuration via the existing `WS.SetConfig` RPC. Reuse `inputParserGeneric2` — same envelope shape over a different transport.

**Why it's appealing:** eliminates the two-round-trip auth penalty ([Errors & Weaknesses § A5](05-errors-and-weaknesses.md#a5--two-round-trips-per-authenticated-request-always)), reduces latency from N×polling-interval to ~0, and scales better with device count.

**Why it's hard:** WebSocket reconnect / backoff logic, NAT traversal (worse than callback mode — needs sustained connectivity in both directions), incompatible with the "Node-RED is behind Docker NAT" workaround that motivated [ADR-007](adrs/007-server-config-node-owns-listener.md).

---

## F2. Auto-discovery via mDNS (S-M)

**For:** new users setting up the package for the first time.

**What:** Shelly devices advertise themselves over mDNS as `_http._tcp.local`. Instead of typing IP addresses, the editor could offer a "scan local network" button that returns a list of discovered Shelly devices.

**Sketch:** add an admin route `/node-red-contrib-shelly-discover` that runs a 5-second [bonjour](https://github.com/watson/bonjour) / [mdns-resolver](https://github.com/lupomontero/mdns-resolver) scan and returns `[{hostname, model, generation}]`. The editor populates a dropdown alongside the manual hostname entry. The discovered hostname auto-populates the device-type selection (via the existing `getshellyinfo` route).

**Why it's appealing:** the highest-friction step in onboarding is "go to your router and find your Shelly's IP." mDNS eliminates it.

**Why it's not on by default:** mDNS doesn't cross subnets (so users with vlan-segregated IoT networks won't see devices), requires UDP multicast (often blocked in Docker default networking), and the additional dependency adds weight to the bundle.

---

## F3. msg.payload schema validation (S)

**For:** flow authors debugging "why isn't my Switch.Set working."

**What:** validate inbound `msg.payload` against a per-device-family schema. Surface specific errors ("expected `parameters.id` to be a number, got string") instead of failing at the device with HTTP 400.

**Sketch:** define [JSON Schema](https://json-schema.org/) or [Zod](https://zod.dev/) schemas for each input parser. Run validation in `node.on('input', ...)` before dispatching. Failed validations emit a clean `msg.error` without touching the network.

**Why it's appealing:** ties into the 11.10.1 error-body work — instead of waiting for the device to say "Argument 'id' is missing", we say it up front. Faster debug loop, no wasted device round trips.

**Cost:** medium if hand-rolled per parser; lower with a tool. Could ship per-family incrementally.

---

## F4. Native BLU node type (M)

**For:** users with several BLU buttons / sensors who currently maintain MAC-filter logic in their flows.

**What:** see [R7 in Recommendations for Refactoring](06-recommendations-for-refactoring.md#r7-surface-blu-events-as-their-own-node-type) — this is the feature corollary of that refactor. A `shelly-blu` node type that wraps a gateway subscription with a MAC filter and emits typed events per BLU device family (button, door/window, H&T, motion, etc.).

**Sketch:** new file [`shelly/nodes/blu-node.js`](../../shelly/nodes/blu-node.js), new registration in [`99-shelly.js`](../../shelly/99-shelly.js), new admin route for "what BLU devices is this gateway seeing right now?" (returns the MAC list from recent gateway events).

**Why it's appealing:** removes a recurring tax from every BLU user's flows. Aligns BLU with the established "one node per physical thing" pattern.

---

## F5. Cloud token rotation / OAuth flow (L)

**For:** users who care about secrets management.

**What:** the cloud node today uses a long-lived `authkey` pasted in by the user. There's no rotation, no expiry handling, no OAuth.

**Sketch:** Shelly Cloud supports OAuth in their developer API. A `shelly-cloud-server` config node could host an OAuth dance and store a refresh token instead of a raw key.

**Why it's appealing:** rotating a raw key today means editing every flow file. OAuth would handle it transparently.

**Cost:** large. Requires the cloud server node to actually run a callback handler for the OAuth redirect, which conflicts with the current model where cloud-server is just a credential store ([ADR-007](adrs/007-server-config-node-owns-listener.md)).

---

## F6. Plugin architecture for device-family parsers (L)

**For:** the next major refactor / future-proofing.

**What:** today's pattern (eight input parsers in one file, plus a switch statement in `getInputParser1`) doesn't scale to a hypothetical world with 30 device families. A plugin model — where each family is a self-contained module that registers itself with the node — would.

**Sketch:**

```js
// shelly/nodes/gen1/families/relay.js
module.exports = {
    name: 'Relay',
    inputParser: async function(msg) { ... },
    statusConverter: function(status) { ... },
    initializer: 'webhook',   // declarative dispatch
};

// shelly/nodes/gen1/registry.js — auto-loads everything in families/
```

**Why it's appealing:** turns adding a new device family into a single-file change with no edits to dispatch tables. Encourages tests-per-family.

**Cost:** large and disruptive. Probably only worth it if combined with [R1](06-recommendations-for-refactoring.md#r1-extract-the-per-device-type-input-parsers-into-one-file-each-m) anyway. Best treated as a 12.0.0 effort.

---

## F7. Per-device `msg.error` policy in callback mode (S)

**For:** flow authors using callback mode.

**What:** currently in callback mode, transient device-side failures (a webhook delivery times out, a callback hits an unbound port) are logged as `node.warn` but don't emit on the node's output. The flow can't react. A per-device option to emit a `msg.error` on certain callback failures would close that gap.

**Sketch:** add a `propagateCallbackErrors` checkbox to the device-node UI; when ticked, the server config node's error events trigger an `msg.error` emit on the device node.

**Cost:** small. Touches the server config nodes and the callback hookup in each device node.

---

## F8. Built-in BLU device list view (S)

**For:** the editor experience.

**What:** an admin route + UI panel that lists every BLU MAC the gateway has seen, with rolling counters and last-seen timestamps. Pure observability, no actuator coverage.

**Sketch:** the gateway node ships event counts into a shared map (per gateway). Admin route returns the map. The editor renders it as a sidebar panel.

**Why it's appealing:** the hardest part of debugging a BLU setup today is "is my BLU device even reaching the gateway?" This makes that visible.

---

## Sorting and prioritising

If the maintainer is picking one to do next, the order I'd suggest:

1. **F3** (schema validation) — small, removes a class of "works for me" support issues.
2. **F4** (native BLU node) — modest size, high user-visible value.
3. **F2** (mDNS discovery) — small, makes onboarding dramatically smoother.
4. **F1** (WebSocket) — bigger lift but unlocks a step change in latency and request load.

F5, F6 are big swings, best timed with a major version. F7, F8 are nice-to-have polish.
