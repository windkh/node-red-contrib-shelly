# Testing strategy

A concrete, executable plan for going from **0% coverage** today to **a useful test suite running on every push** — without adding heavy dependencies or breaking the existing release pipeline.

This document is meant to be **acted on** in phases. Each phase is a single PR. The aim is to make the second-most-important thing in this repo (releasing correctly) cheaper and safer.

---

## Goals

- `npm test` runs all tests locally with one command, no setup beyond `npm install`.
- Tests run automatically in CI on every push and pull request to `master`.
- Coverage report uploads as a CI artefact so it can be inspected from any failing run.
- Coverage **thresholds** enforced by CI — a regression below the threshold fails the build.
- A clear path from the first PR (small, targeted) to comprehensive coverage of the bug-prone parts of the codebase.

## Non-goals

- 100% coverage — not a useful target. Aim at the bug-prone surface.
- Integration tests against real Shelly hardware — too operationally heavy for CI. Mock the transport.
- A Node-RED end-to-end runner — Node-RED's own test helper is heavy and pulls in the full runtime. We can get most of the value with simpler unit tests against mocked `RED`.
- Bringing in jest / vitest / mocha — the built-in `node:test` runner is enough and adds zero dependencies.

---

## Tooling choice

| Concern | Tool | Why |
|---|---|---|
| Test runner | `node:test` (built-in since Node 20) | Zero dependencies. We just bumped engines to `>=20`, so it's available. Real `describe` / `it` style. Watch mode, parallelism, filters, all built in. |
| Assertions | `node:assert/strict` (built-in) | Same — no deps. Strict-mode by default is the right default. |
| Coverage | `c8` (one dev dep) | Wraps V8's native coverage. The only mainstream coverage tool that pairs cleanly with `node:test`. Tiny dependency footprint. |
| HTTP mocking | `nock` (one dev dep) | The standard for axios mocking. Lets us simulate Shelly device responses (including the digest 401-retry dance) without hitting hardware. |
| CI runner | GitHub Actions | Already in use. |

**Total new dependencies:** 2 dev deps (`c8`, `nock`). Both are mature, widely used, and small.

---

## Directory layout

```
test/
├── unit/
│   ├── utils.test.js                  Pure helpers from shelly/lib/utils.js
│   ├── configuration.test.js          Catalog lookups
│   ├── parsers/
│   │   ├── gen1-relay.test.js
│   │   ├── gen1-dimmer.test.js
│   │   ├── gen1-rgbw.test.js
│   │   ├── gen1-roller.test.js
│   │   ├── gen1-thermostat.test.js    (would have caught the scheduleProfile bug)
│   │   ├── gen1-sensor.test.js
│   │   ├── gen1-button.test.js
│   │   ├── gen1-measure.test.js
│   │   └── gen2-generic.test.js
│   ├── status-converters.test.js      convertStatus1, convertStatus2
│   └── transport.test.js              shellyRequestAsync + digest retry (nock)
└── helpers/
    ├── fake-red.js                    Minimal Node-RED RED-object stub
    └── mock-shelly.js                 nock interceptors for typical device responses
```

The split into `unit/` leaves room for `integration/` later (when / if a Shelly-device simulator emerges).

---

## What to test in what order

Each phase is one PR. Each phase produces a working `npm test` that's more capable than the last.

### Phase 1 — Tooling + low-hanging fruit (reachable: ~10% coverage)

**Wire up the runner, prove it works, cover the pure helpers.**

- Add `c8` to devDependencies.
- Add `npm test` and `npm run coverage` scripts.
- Write tests for [`shelly/lib/utils.js`](../../shelly/lib/utils.js): `isMsgPayloadValid`, `isMsgPayloadValidOrArray`, `isEmpty`, `trim`, `replace`. All five are pure and trivially testable.
- Wire CI to run `npm test` on push / PR.
- Upload coverage report as a CI artefact.

**Why first:** lowest risk, highest learning value. Establishes the patterns and CI integration before any harder testing.

### Phase 2 — Catalog and status converters (reachable: ~25%)

**Test the data layer.**

- Tests for [`shelly/lib/configuration.js`](../../shelly/lib/configuration.js): `getDevice`, `getDeviceType`, `getDeviceTypes1/2`, `isExactTypeGen1/2`, `getDeviceTypeInfos`.
- Tests for the status converters (`convertStatus1`, `convertStatus2`). They're pure functions but live inside the node files — see "extraction" note below.

**Why second:** still pure functions, no I/O. Validates `config.json` shape implicitly — if a future edit breaks the catalog, tests will catch it.

### Phase 3 — Input parsers (reachable: ~50%)

**The bug-prone surface.** This is where the value-per-test ratio is highest.

- One test file per device family, asserting on the produced URL or RPC envelope.
- Cover at least:
  - Default path (no command parameters → no route returned).
  - Each documented input field exercised.
  - **Boundary checks** — the scheduleProfile bug was an out-of-range value silently passing through. Every range guard should have a test below, at, and above the bounds.
  - The `on:true/false` ↔ `turn:'on'/'off'` translation.

**Why third:** these functions are pure but live inside the device-node IIFE. They need to be reachable for testing, which couples this phase to a small extraction (see "extraction" below).

### Phase 4 — Transport (reachable: ~65%)

**Test the auth and retry logic with nock.**

- Mock a gen 1 device: GET `/relay/0?turn=on` → 200 with status JSON. Assert returned payload.
- Mock a gen 1 device with Basic auth: 401 → after retry with auth header → 200. Assert auth header value.
- Mock a gen 2 device with Digest auth: 401 with `www-authenticate` → assert the second request carries a correct `Digest` header.
- Mock a gen 2 device returning a 400 with `{"error":{"code":-103,...}}` → assert the thrown error message includes the body (the 11.10.1 improvement).

**Why fourth:** needs `nock`. Slightly more setup than pure unit tests. Catches the entire transport layer including the auth dance — which has had no tests despite being the most security-sensitive part of the codebase.

### Phase 5 — Lifecycle (reachable: ~70-75%)

**Mock the Node-RED `RED` object and exercise the constructor.**

- Use `test/helpers/fake-red.js` to provide a minimal `RED.nodes.createNode`, `RED.nodes.registerType`, `RED.nodes.getNode`, `RED.httpAdmin`, `RED.log`.
- Assert that `new ShellyGen1Node({ hostname: '...', devicetype: 'Relay', mode: 'polling' })` sets up the expected `axiosInstance`, `pollingTimer`, and event handlers.
- Test the `close` handler — assert `node.closing === true`, timers cleared, listeners removed.

**Why fifth:** needs more scaffolding than the others. By this point we know how the codebase shapes up under tests, so the harness is informed.

The remaining ~25% (callback-mode network code paths) is genuinely hard to unit-test without a device simulator. Leave it.

---

## A note on extraction

The per-family input parsers and status converters in [`gen1-node.js`](../../shelly/nodes/gen1-node.js) and [`gen2-node.js`](../../shelly/nodes/gen2-node.js) are **nested inside** the `module.exports = function(RED) { ... }` factory. They can't be imported directly:

```js
// This doesn't work today:
const { inputParserRelay1Async } = require('../../shelly/nodes/gen1-node');
//                                              ↑ exports a factory, not the parsers
```

Two options:

**Option A — extract to standalone files** (preferred, aligns with [R1 in refactoring recommendations](../architecture/06-recommendations-for-refactoring.md#r1-extract-the-per-device-type-input-parsers-into-one-file-each-m)):

```
shelly/nodes/gen1/parsers/
├── relay.js          module.exports = async function inputParserRelay1Async(msg) { ... }
├── dimmer.js
├── ...
```

These don't need the `RED` factory because they're pure. They get imported by `gen1-node.js` _and_ by tests.

**Option B — export-for-testing hook** (faster, uglier):

```js
// At the bottom of gen1-node.js, before the factory returns:
module.exports.__test = { inputParserRelay1Async, inputParserDimmer1Async, ... };
```

Tests reach in via `require('../../shelly/nodes/gen1-node').__test.inputParserRelay1Async`. Convention-marked as a testing escape hatch.

**Recommendation:** Option A. The refactor is small, lasting, and makes the rest of the codebase easier to read. Option B is technical debt deliberately incurred to avoid a refactor that pays for itself.

This proposal **assumes Option A** for Phases 3-5. Phase 1 and 2 (utils, config, status converters) don't need any extraction — they're already in importable files.

---

## Concrete first-PR shape (Phase 1)

### `package.json` changes

```jsonc
{
  "scripts": {
    "prepare": "husky install",
    "lint": "eslint shelly --ext .js --format unix --ignore-pattern scripts",
    "postlint": "echo ✅ lint valid",
    "test": "node --test test/unit",
    "test:watch": "node --test --watch test/unit",
    "coverage": "c8 --reporter=text --reporter=html --reporter=lcov node --test test/unit",
    "coverage:check": "c8 --check-coverage --lines 10 --functions 10 --branches 8 node --test test/unit"
  },
  "devDependencies": {
    "c8": "^10.1.3",
    "eslint": "^8.20.0",
    "eslint-config-prettier": "^8.5.0",
    "eslint-plugin-prettier": "^4.2.1",
    "husky": "^8.0.1",
    "prettier": "^2.7.1"
  }
}
```

Thresholds start **deliberately low** in Phase 1 (10% lines / 10% functions / 8% branches). Each phase ratchets them upward.

### `test/unit/utils.test.js` (example, fully working)

```js
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const utils = require('../../shelly/lib/utils.js');

describe('utils.isMsgPayloadValid', () => {
    it('rejects undefined msg', () => {
        assert.equal(utils.isMsgPayloadValid(undefined), false);
    });

    it('rejects msg without payload', () => {
        assert.equal(utils.isMsgPayloadValid({}), false);
    });

    it('rejects array as msg', () => {
        assert.equal(utils.isMsgPayloadValid([{ payload: { a: 1 } }]), false);
    });

    it('rejects empty payload object', () => {
        assert.equal(utils.isMsgPayloadValid({ payload: {} }), false);
    });

    it('rejects array payload', () => {
        assert.equal(utils.isMsgPayloadValid({ payload: [1, 2] }), false);
    });

    it('accepts non-empty object payload', () => {
        assert.equal(utils.isMsgPayloadValid({ payload: { relay: 0, on: true } }), true);
    });
});

describe('utils.trim', () => {
    it('returns undefined for undefined input', () => {
        assert.equal(utils.trim(undefined), undefined);
    });

    it('returns undefined for empty string', () => {
        assert.equal(utils.trim(''), undefined);
    });

    it('strips leading and trailing whitespace', () => {
        assert.equal(utils.trim('  hello  '), 'hello');
    });
});

describe('utils.replace', () => {
    it('returns undefined for falsy input', () => {
        assert.equal(utils.replace(undefined, /x/g, 'y'), undefined);
        assert.equal(utils.replace('', /x/g, 'y'), undefined);
    });

    it('does global regex replace', () => {
        assert.equal(utils.replace('a"b"c', /"/g, ''), 'abc');
    });

    it('does string-literal replace', () => {
        assert.equal(utils.replace('hello %URL% world', '%URL%', 'http://x'), 'hello http://x world');
    });
});
```

That's roughly 50 lines of tests covering ~80% of `utils.js`. Phase 1 is mostly this kind of work.

### CI workflow changes

Add a `test` step to [`.github/workflows/node.js.yml`](../../.github/workflows/node.js.yml):

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [20.x, 22.x]
    steps:
    - uses: actions/checkout@v4
    - name: Use Node.js ${{ matrix.node-version }}
      uses: actions/setup-node@v4
      with:
        node-version: ${{ matrix.node-version }}
    - run: npm ci
    - run: npm run lint
    - run: npm test                       # ← new
    - run: npm run coverage:check         # ← new (gates on the threshold)
    - name: Upload coverage report        # ← new
      if: matrix.node-version == '22.x'
      uses: actions/upload-artifact@v4
      with:
        name: coverage-report
        path: coverage/
        retention-days: 14
```

`coverage:check` failing breaks the build. The HTML coverage report is uploaded as a CI artefact — downloadable from any run, useful for inspecting what's covered without running locally.

### Threshold ratchet plan

Each phase raises the thresholds in `coverage:check`:

| Phase | Lines | Functions | Branches | Notes |
|---:|---:|---:|---:|---|
| 1 | 5 | 10 | 5 | Pure helpers in `lib/utils.js` + `lib/configuration.js`. Branch %% is high because tested files are densely branched. |
| 2 | 10 | 50 | 80 | + status converters extracted to `shelly/nodes/gen{1,2}/`. |
| 3 | 30 | 65 | 85 | + per-family input parsers extracted to `shelly/nodes/gen{1,2}/parsers/`. The 1342-line gen1-node.js shrinks dramatically; line coverage jumps. |
| 4 | 45 | 75 | 88 | + transport tests (`shellyRequestAsync` with nock, digest 401 retry). |
| 5 | 55 | 80 | 90 | + lifecycle (constructor / close handler with mocked Node-RED `RED`). |

Note: line / function / branch percentages don't move in lockstep. Branch and function percentages spike early because the small tested files are well-branched; line percentage moves slowly until the large `gen1-node.js` and `gen2-node.js` get split (Phase 3).

Each phase's PR bumps the previous floor. CI then prevents regressions back below it.

---

## Optional: Codecov integration

If you want a coverage badge on the README and per-PR coverage delta comments:

```yaml
- name: Upload coverage to Codecov
  if: matrix.node-version == '22.x'
  uses: codecov/codecov-action@v4
  with:
    files: ./coverage/lcov.info
    fail_ci_if_error: false
```

Requires signing up at [codecov.io](https://about.codecov.io/) and adding a `CODECOV_TOKEN` repo secret. Optional and additive — the local thresholds in `coverage:check` are the real gate.

---

## Why this beats the status quo

- **The 11.9.x series shipped four real logic bugs** to a published release: the missing-await in `start()`, the `urls[i]→urls[j]` index swap, the missing-await in RGBW init, and the always-true `scheduleProfile` range guard. Three of the four are pure-function bugs that would have been caught by a 5-line test in Phases 1-3.
- **Husky is now wired** (since 11.9.4) but only runs `npm run lint`. Once `npm test` exists, adding it to the pre-commit hook is a one-line change — every local commit then runs the suite.
- The maintainer's current QA strategy ("I run it against my home fleet") doesn't scale and isn't replicable by contributors. Tests give every PR the same baseline check.

---

## What I'd suggest doing first

Phase 1 only — it's small, low-risk, and you can see exactly what the developer ergonomics feel like before committing to the broader plan. Once you've used `npm test` locally a few times you'll know whether the runner choice fits your style. Subsequent phases follow the same pattern, so the first one is the highest-information one.

If you want, I can implement Phase 1 as a single PR-shaped commit:

- Add `c8` to devDeps and the four new npm scripts.
- Write the `test/unit/utils.test.js` shown above plus one more file for `configuration.js` to prove the catalog-lookup pattern.
- Update the CI workflow with the test + coverage-check + artefact-upload steps.
- Wire `npm test` into the husky pre-commit hook.
- Land at ~12-15% coverage with thresholds set at 10%.

Say the word and I'll send it.
