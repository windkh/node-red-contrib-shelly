# 05 · Errors and Weaknesses

This chapter is the **honest audit** of what's fragile, broken, or merely awkward in the codebase. It blends bugs that are still live with ones that have been fixed but are worth documenting so the next reader knows what to look for.

A short legend at the top of each entry:

- 🔥 **Live** — still present in master.
- ✅ **Fixed** — addressed in a specific release; included here because the failure mode is informative.

Items are grouped by category and listed in roughly descending impact within each group.

---

## A. Auth and transport

### A1. ✅ Missed first online/offline transition (fixed in 11.9.1)

`shelly.start` assigned the Promise returned by `shellyPing` (without `await`) to `node.online`. The first polling iteration then compared `Promise === true/false`, which is never true, so the very first reachability transition (and its `msg.error` notification when the device first went offline) was silently dropped. Loop self-healed from the second tick.

### A2. 🔥 Module-global `nonceCount` never resets per server nonce

[`shelly/lib/shelly.js:8,77`](../../shelly/lib/shelly.js#L8) — a single integer is shared by all device nodes and is only ever incremented. RFC 7616 says `nc` should reset to `00000001` per `(client, nonce)` pair. Shelly firmware accepts monotonic-only, so this is **dormant** — the bug doesn't fire against real Shelly hardware. The risks:

- Wrap-around after `0xFFFFFFFF` increments (~13 years of busy polling) makes the formatted nc non-monotonic and breaks auth until restart.
- Strictly-conformant servers (none currently in scope) would reject the auth as replayed.

### A3. 🔥 Fragile `www-authenticate` parser

[`shelly/lib/shelly.js:73-75`](../../shelly/lib/shelly.js#L73-L75) — `split(', ')` then `split('=')`. Breaks on quoted values containing `", "` or `=`. Works against current Shelly firmware (whose challenge contains neither), but is brittle to future firmware changes.

### A4. ✅ Device error bodies discarded on non-2xx (fixed in 11.10.1)

`shellyRequestAsync` used to throw `new Error('Request failed with status code 400')` for any non-200, non-401 status — discarding the JSON-RPC error body the device returned. This left users with [#195](https://github.com/windkh/node-red-contrib-shelly/issues/195)-style "Request failed with status code 400" reports that the maintainer couldn't reproduce because the actual cause (e.g., `{"error":{"code":-103,"message":"Argument 'id' is missing"}}`) was hidden. The 11.10.1 fix wraps the axios call in try/catch and folds `error.response.data` into the thrown error.

### A5. 🔥 Two round-trips per authenticated request, always

By design ([ADR-008](adrs/008-digest-auth-401-retry.md)): every authenticated request to a gen 2+ device starts with a 401 challenge and is re-sent with the digest header. No caching of the digest header or nonce across requests. Doubles the request rate against authenticated devices.

---

## B. Lifecycle and resource management

### B1. ✅ Init IIFE raced the close handler (fixed in 11.10.0)

If a flow was redeployed while a node's `initializer` was still awaiting (slow network, sleeping sensor), the IIFE could resolve _after_ the close handler had already run `clearInterval`, then schedule a fresh `setInterval` that nothing ever cleared. Dangling timer kept calling `node.initializer` on the orphaned node forever — N timers leaked per N redeploys. Fixed by setting `node.closing = true` in close and short-circuiting downstream awaits.

### B2. ✅ Callback mode silently downgraded to polling on misconfiguration (fixed in 11.10.0)

Selecting "callback" mode without binding a server config node used to set `node.mode = 'polling'` with no warning. This was the #1 source of "callback isn't working" support requests. Now emits `node.warn(...)` and a yellow "No server: polling" status badge.

### B3. 🔥 Callback resources are not torn down on `close`

A `// TODO: call node.uninitializer();` comment in both [`gen1-node.js:1322`](../../shelly/nodes/gen1-node.js#L1322) and [`gen2-node.js:683`](../../shelly/nodes/gen2-node.js#L683) marks the known gap: when a device node is removed, the uploaded callback script (gen 2+) and the installed webhooks (gen 1) remain on the device. They keep POSTing to a port that no longer has a listener (or worse, to a listener now owned by a different deployment).

This isn't strictly a bug — Node-RED's `close` contract doesn't oblige us to externalise cleanup — but it surprises users who later wonder why their old Node-RED deploy is "haunting" their devices.

### B4. 🔥 Two timer types per node, single `closing` flag

The `node.closing` flag short-circuits the polling loop, the init IIFE, and the retry interval. But it doesn't cancel in-flight HTTP calls — those keep going to completion. With axios 5-second default timeout, a node being closed mid-call can take up to 5 seconds to actually finish closing. Not user-visible most of the time, but unbounded close latency in degenerate cases.

---

## C. Code quality and ergonomics

### C1. 🔥 Comment density is 4.7% across the codebase

145 comment lines across 3,104 LOC of Node code. Concentrated in [`shelly/lib/`](../../shelly/lib/) (7% in [`shelly.js`](../../shelly/lib/shelly.js)) and almost absent from [`utils.js`](../../shelly/lib/utils.js) (0%). The node files have 4-5% — adequate but light for the size of `gen1-node.js` (1342 LOC).

This isn't a bug, but it's a maintainability risk on a project this size with 18 unique contributors and no test suite.

### C2. ✅ Lint was silently broken (fixed in 11.9.4)

The repo was upgraded to husky v8 but kept the husky v4-style `"husky.hooks"` block in package.json, which v8 ignores. There was no `.husky/` directory and no `prepare` script — so the pre-commit lint gate had been silently disabled for at least one major-version cycle. Formatting drift had accumulated on master.

### C3. ✅ Misleading error reporting (mostly fixed in 11.9.3)

Several `node.error(text, error)` calls passed the error as a second argument, which Node-RED silently drops. `cloud-node.js` rendered errors in the status badge as `[object Object]`. `gen2-server-node.js` reported "Shelly gen1 server failed to start" inside the gen 2 server. All fixed in 11.9.3; 11.10.1 added device-body enrichment per A4.

### C4. 🔥 Inconsistent `node.captureBlutooth` spelling

A typo in a public-facing config property (`captureblutooth` in HTML config, `captureBlutooth` in JS). Used consistently throughout the codebase, so it works — but is exposed on the editor JSON and would be embarrassing to surface in any doc / schema. Renaming requires a config migration.

### C5. 🔥 Two near-duplicate functions for the same job

[`shellyPing`](../../shelly/lib/shelly.js#L221) and [`tryCheckDeviceType`](../../shelly/lib/shelly.js#L289) do almost the same thing — fetch `/shelly`, verify generation, verify device type prefix. Subtle differences (which one writes `node.shellyInfo`, which status colour is used on failure, whether the warn message includes the issue-tracker link). Maintaining both is friction.

---

## D. Configuration and packaging

### D1. ✅ `crypto` and `path` as userland deps (fixed in 11.9.0)

`package.json` listed the deprecated npm packages `crypto@^1.0.1` and `path@^0.12.7` as dependencies. Both are unmaintained shims for built-in Node modules — `require('crypto')` resolves to Node's built-in regardless of these being installed, but their presence triggered npm deprecation warnings and Snyk advisories.

### D2. ✅ CI matrix typo (fixed in 11.9.0)

`.github/workflows/node.js.yml` had `node-version: [16.x, 18.x, 20,x]` — note the comma instead of a dot. The Node 20 entry parsed as two items (`20` and `x`); the `x` entry silently no-opped. Three Node versions were claimed; only two ran.

### D3. ✅ Tracked Node versions were EOL (fixed in 11.9.0)

`engines.node >=16.0.0` was set; Node 16 went EOL in September 2023. The publish workflow ran on Node 16. Bumped to `>=20`.

### D4. 🔥 No `files` field in `package.json`, no `.npmignore`

The published tarball includes `.eslintrc.yaml`, `.gitattributes`, `.husky/`, `CHANGELOG.md`, `.github/workflows/`, `examples/`, etc. — about 61.5 KB packed. Most of those have no value to npm consumers. Slim-down would be cosmetic but proper.

---

## E. Testing

### E1. 🔥 Zero automated tests

[`.github/workflows/node.js.yml`](../../.github/workflows/node.js.yml) only runs `npm ci`. The `npm test` step is commented out. There is no test framework configured. **Coverage is 0%.**

The package is exercised by:

- The maintainer running it against a varied home fleet.
- Users opening issues against published versions.
- 28 example flows in [`examples/`](../../examples/) — but these aren't run automatically.

This is the single largest quality risk. The codebase has had at least four real logic bugs reach a published release in the recent past (the four P0 items in the 11.9.x line), each of which a one-line unit test would have caught. There is no test isolation between gen 1, gen 2, cloud, or callback-mode code paths.

---

## Open issues at time of writing

| Issue | Status |
|---|---|
| [#195](https://github.com/windkh/node-red-contrib-shelly/issues/195) — "Request failed with status code 400" | Should now be self-diagnosing post-11.10.1; awaiting reporter follow-up |
