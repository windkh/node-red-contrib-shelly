# 06 · Recommendations for Refactoring

What follows are structural changes that would pay off in maintainability and review velocity. Each is sized roughly (S / M / L) so you can pick by available time, and grouped by theme.

These are **refactoring** suggestions — they restructure existing behaviour without adding features. New features and capabilities are in [Future Improvements](07-future-improvements.md).

---

## R1. Extract the per-device-type input parsers into one file each (M)

**Today:** [`gen1-node.js`](../../shelly/nodes/gen1-node.js) is 1342 LOC, and ~70% of that bulk is the eight per-family input parsers (`inputParserRelay1Async`, `inputParserDimmer1Async`, …) plus `convertStatus1`. The same shape repeats less drastically in [`gen2-node.js`](../../shelly/nodes/gen2-node.js).

**Proposal:** move each family's parser + status converter into its own file under `shelly/nodes/gen1/parsers/<family>.js`. Each file exports two functions. `gen1-node.js` becomes a thin orchestrator (~300 LOC) that imports them and dispatches via the existing function table.

**Why:**

- The bulk of bug fixes target one family at a time (e.g., the TRV `scheduleProfile` bug in 11.9.2 only touched `inputParserThermostat1Async`). Smaller files mean cleaner diffs, easier review.
- Eight parsers in one file means cross-contamination risk — a regex search-and-replace can mangle the wrong family. With separate files this fails fast.
- Lets us introduce per-family tests (see R6) without test files that have to know about every device family.

**Cost:** mechanical refactor. No behaviour change. Worst risk is breaking the `require` graph; eslint would catch the obvious cases.

---

## R2. Collapse `shellyPing` and `tryCheckDeviceType` (S)

**Today:** two near-duplicate functions doing the same thing in [`lib/shelly.js`](../../shelly/lib/shelly.js) with subtle behavioural divergence ([§C5 in Errors & Weaknesses](05-errors-and-weaknesses.md#c5-two-near-duplicate-functions-for-the-same-job)).

**Proposal:** keep one (call it `checkDevice(node, types, opts)` where opts toggles status-update behaviour). Update both call sites in [`shelly/nodes/gen1-node.js`](../../shelly/nodes/gen1-node.js) and [`shelly/nodes/gen2-node.js`](../../shelly/nodes/gen2-node.js).

**Why:** removes a footgun. Fixes one of the two functions tend not to be applied to the other.

**Cost:** small, but touches reachability — which is the hottest path in the codebase. Worth a careful manual verification against at least one gen 1 and one gen 2 device.

---

## R3. Promote the device generation / required-node-type mapping to data (S)

**Today:** the mapping from `shellyInfo.gen` to the required node type is hardcoded as an if/else ladder in both `shellyPing` and `tryCheckDeviceType`:

```js
if (shellyInfo.type) { requiredNodeType = 'shelly-gen1'; }
else if (shellyInfo.gen === 2) { requiredNodeType = 'shelly-gen2'; }
else if (shellyInfo.gen === 3) { requiredNodeType = 'shelly-gen2'; }
else if (shellyInfo.gen === 4) { requiredNodeType = 'shelly-gen2'; }
```

This recurs in 99-shelly.js (admin route) and the editor JS.

**Proposal:** put a `generationToNodeType` map in [`shelly/config/config.json`](../../shelly/config/config.json) (e.g., `{"1": "shelly-gen1", "2": "shelly-gen2", "3": "shelly-gen2", "4": "shelly-gen2"}`) and read it from one place. When gen 5 lands, it's a JSON edit.

**Why:** [ADR-009](adrs/009-gen3-gen4-share-gen2-codepath.md) already commits us to data-driven generation handling, but the mapping isn't actually in the data yet.

**Cost:** tiny.

---

## R4. Move HTTP transport off `lib/shelly.js` into `lib/transport.js` (M)

**Today:** [`lib/shelly.js`](../../shelly/lib/shelly.js) is 430 LOC that mixes three concerns:

1. HTTP transport (`shellyRequestAsync`, getHeaders, digest auth).
2. Device-reachability (`shellyPing`, `tryCheckDeviceType`).
3. Polling-loop lifecycle (`start`, `startAsync`).

These have different test surfaces and different reasons to change.

**Proposal:** split into `lib/transport.js` (HTTP + auth), `lib/reachability.js` (reachability), `lib/polling.js` (loop). Each imports the layer below. Per-file LOC drops to ~150-200.

**Why:**

- Lets transport be tested in isolation against `nock` or `axios-mock-adapter`.
- The digest auth code becomes substitutable — a future async-cache-the-nonce optimisation only touches transport.
- The polling loop's `closing` checks (added in 11.10.0) belong with the loop, not with the auth layer.

**Cost:** medium. Touching transport is risky; should land with tests (see R6).

---

## R5. Add `prepare` guard for non-git environments (S)

**Today:** [`package.json`](../../package.json) has `"prepare": "husky install"`. If a user installs this package _as a dependency_ in a project that isn't itself a git repo, `husky install` errors. Not a problem today because users `npm install node-red-contrib-shelly`, but worth hardening.

**Proposal:**

```json
"prepare": "husky install || true"
```

or, better, gate on the presence of `.git`:

```json
"prepare": "node -e \"require('fs').existsSync('.git')\" && husky install || true"
```

**Cost:** trivial.

---

## R6. Introduce a test suite (L)

**Today:** zero coverage ([§E1 in Errors & Weaknesses](05-errors-and-weaknesses.md#e1-zero-automated-tests)). At least four user-visible bugs reached master in the 11.9.x series alone, each of which a one-line unit test would have caught.

**Proposal — minimum viable:**

- `node:test` (built-in, no dependency) for unit tests of pure functions: the input parsers and status converters in particular have no I/O and are trivially testable.
- [`nock`](https://github.com/nock/nock) for HTTP-level testing of `shellyRequestAsync`: synthesise a digest challenge + response and assert the second request carries the right header.
- A small `npm test` script wired up in CI (`.github/workflows/node.js.yml` already has the placeholder commented out).

**Coverage targets to aim for, in order of value:**

1. Every gen 1 input parser (`inputParserRelay1Async` etc.) — pure, easy. Probably ~150 LOC of tests for 80% coverage of [`gen1-node.js`](../../shelly/nodes/gen1-node.js)'s parser layer.
2. `convertStatus1` / `convertStatus2`.
3. The `configuration.js` lookups.
4. `shellyRequestAsync` with mocked axios.
5. The lifecycle phases of `ShellyGen1Node` / `ShellyGen2Node` against a mocked Node-RED `RED` object.

The first three together would already lift coverage from 0% to ~40% and would have caught three of the four P0 bugs in 11.9.x.

**Cost:** large initially, small per-feature afterwards. The first PR is the expensive one.

---

## R7. Surface BLU events as their own node type (M)

**Today:** [ADR-006](adrs/006-blu-via-gen2-gateway.md) — BLU devices ride the gen 2 gateway node. Users filter by MAC in their flow. Each BLU device has no representation in the editor.

**Proposal (compatible with the existing model):** add a `shelly-blu` node type that subscribes to a chosen `shelly-gen2-server` and filters by user-configured MAC. Internally it's a thin adapter — the gateway still does the actual scanning. Users get one node per BLU device, type-completed.

**Why:** removes the "filter by MAC in a function node" boilerplate from every flow. Aligns the BLU experience with the gen 1/2/cloud experience.

**Cost:** medium. Mostly new code (~200-300 LOC); no impact on existing flows.

---

## R8. Schema-validate `config.json` at load time (S)

**Today:** [`lib/configuration.js`](../../shelly/lib/configuration.js) reads `config.json` and trusts it. A typo (`"gen": "1 "` with trailing space, or `"type": "Relay "`) won't surface until a user picks the device in the editor.

**Proposal:** add an [Ajv](https://ajv.js.org/) schema validation at load. Fail fast with a useful error.

**Why:** the catalog is now 123 entries and growing. Hand-editing JSON without schema feedback is increasingly error-prone.

**Cost:** small. Adds one runtime dependency (Ajv) or could be a hand-rolled validator since the schema is shallow.

---

## R9. Drop the `cloud-server-node` (S, if breaking changes are acceptable)

**Today:** [`shelly-cloud-server`](../../shelly/nodes/cloud-server-node.js) is 25 LOC. It just stores `serveruri` + `authkey`. It's a config node only because the original pattern from gen 1/2 (where the server config _does_ own a listener) was copied.

**Proposal:** inline the credentials onto the `shelly-cloud` node directly. Drop the server type.

**Why:** lower mental load — one node per cloud account instead of two. The "shared listener" rationale doesn't apply to cloud (no listener).

**Cost:** breaks every existing flow that uses cloud nodes. Probably not worth it. Listed for completeness; would only ship as part of a major version bump.

---

## Suggested ordering

If you want to make a meaningful refactoring sweep in one cycle:

1. **R5** (5 minutes — tighten the existing tooling first).
2. **R3** + **R2** (combined, a single PR; both are tiny and reduce future-maintenance overhead).
3. **R1** (the split that makes everything else easier to think about).
4. **R6** (testing — this is the actual force multiplier).
5. **R4** (transport extraction — only really pays off once R6 is in place).

R7, R8, R9 are independent — pick if and when the value lines up.
