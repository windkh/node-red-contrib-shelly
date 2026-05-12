# 08 · Statistics

Snapshot of the codebase against [`V11.10.1`](https://github.com/windkh/node-red-contrib-shelly/releases/tag/V11.10.1), regenerated 2026-05-11.

## Lines of code

### Node-side JavaScript (lint-active)

| File | LOC |
|---|---:|
| [`shelly/nodes/gen1-node.js`](../../shelly/nodes/gen1-node.js) | 1342 |
| [`shelly/nodes/gen2-node.js`](../../shelly/nodes/gen2-node.js) | 703 |
| [`shelly/lib/shelly.js`](../../shelly/lib/shelly.js) | 430 |
| [`shelly/lib/configuration.js`](../../shelly/lib/configuration.js) | 172 |
| [`shelly/nodes/cloud-node.js`](../../shelly/nodes/cloud-node.js) | 164 |
| [`shelly/99-shelly.js`](../../shelly/99-shelly.js) | 104 |
| [`shelly/nodes/gen2-server-node.js`](../../shelly/nodes/gen2-server-node.js) | 58 |
| [`shelly/nodes/gen1-server-node.js`](../../shelly/nodes/gen1-server-node.js) | 55 |
| [`shelly/lib/utils.js`](../../shelly/lib/utils.js) | 51 |
| [`shelly/nodes/cloud-server-node.js`](../../shelly/nodes/cloud-server-node.js) | 25 |
| **Total** | **3104** |

### Device-side scripts (mJS runtime, lint-excluded)

| File | LOC |
|---|---:|
| [`shelly/scripts/ble-shelly-blu.js`](../../shelly/scripts/ble-shelly-blu.js) | ~265 (vendored from `ALLTERCO/shelly-script-examples`) |
| [`shelly/scripts/callback.js`](../../shelly/scripts/callback.js) | ~80 |
| **Total device-side** | **345** |

### Other artefacts

| Artefact | Size / Count |
|---|---:|
| Admin UI HTML ([`99-shelly.html`](../../shelly/99-shelly.html)) | 38.1 KB |
| Device catalog ([`config/config.json`](../../shelly/config/config.json)) | 30 KB, 123 device entries |
| Example flows ([`examples/`](../../examples/)) | 28 JSON files, ~85 KB combined |
| Icons | 3 PNG files |

### Function count

| File | Top-level + nested `function` declarations |
|---|---:|
| `shelly/nodes/gen1-node.js` | 23 |
| `shelly/nodes/gen2-node.js` | 16 |
| `shelly/lib/shelly.js` | 12 |
| `shelly/lib/configuration.js` | 9 |
| `shelly/lib/utils.js` | 5 |
| `shelly/nodes/cloud-node.js` | 4 |
| `shelly/99-shelly.js` | (admin handlers + registration) |
| Server nodes (each) | 1 |
| **Total** | **72** |

Notable: `gen1-node.js` has 23 functions / 1342 LOC, average ~58 LOC/function — well above the rule-of-thumb 30 LOC suggested for readability. The largest is `inputParserDimmer1Async` and the family of `inputParserRGBW1Async` / `tryInstallWebhook1Async`, all over 100 LOC.

---

## Coverage

**Test coverage: 0%.** There is no test framework configured, no `test/` directory, and the `npm test` step in CI is commented out. This is the single largest quality risk in the project — see [Errors & Weaknesses § E1](05-errors-and-weaknesses.md#e1-zero-automated-tests).

Coverage that **could** be achieved if tests were added (rough estimates per [Refactoring R6](06-recommendations-for-refactoring.md#r6-introduce-a-test-suite-l)):

| Test investment | Reachable coverage |
|---|---:|
| Input parser unit tests (gen 1 only) | ~25% |
| + Status converters | ~30% |
| + Configuration lookups | ~35% |
| + Transport with mocked axios | ~55% |
| + Lifecycle with mocked Node-RED RED object | ~70% |

The remaining 30% lives in callback-mode network code paths that are genuinely hard to unit-test without a device-side simulator.

---

## Comment density

| File | Comments / LOC | % |
|---|---|---:|
| `shelly/lib/shelly.js` | 30 / 430 | 7.0% |
| `shelly/nodes/gen2-node.js` | 36 / 703 | 5.1% |
| `shelly/nodes/gen1-node.js` | 55 / 1342 | 4.1% |
| `shelly/lib/configuration.js` | 8 / 172 | 4.7% |
| `shelly/99-shelly.js` | 10 / 104 | 9.6% |
| `shelly/nodes/cloud-node.js` | 6 / 164 | 3.7% |
| **Average across Node code** | **145 / 3104** | **4.7%** |

Comments concentrate where they should — in the shared library — and thin out in the larger node files. Several functions (input parsers especially) have only a single one-liner docstring like `// Creates a route from the input.`

The codebase reads more like "self-documenting code" than commented prose. Function and variable names are descriptive, but high-LOC functions still pose a comprehension burden without comments to anchor sections.

---

## Quality Index

There's no industry-standard "quality index", so this section defines one for our purposes and reports against it.

### Method

The index combines five sub-scores, each on 0–10. Final score is a weighted sum (out of 100).

| Sub-score | Weight | How measured |
|---|---:|---|
| **Lint compliance** | 15 | 10 if `npm run lint` passes, 0 if it fails, linear in between by error count. |
| **Test coverage** | 30 | 1 point per 10 percentage points of statement coverage, capped at 10. |
| **Comment density** | 10 | 10 at >=10%, scaled linearly down to 0 at 0%. |
| **Average function size** | 15 | 10 at <=20 LOC/fn, 5 at 50 LOC/fn, 0 at >=100 LOC/fn. |
| **Dependency health** | 15 | 10 if zero `npm audit` advisories, -1 per advisory, capped at 0. |
| **CI / release hygiene** | 15 | 10 if lint gate is wired, CI matrix is valid, publish workflow works, semver follows project pattern. Composite judgment. |

### Score (2026-05-11, against V11.10.1)

| Sub-score | Raw | Score | Weighted |
|---|---|---:|---:|
| Lint compliance | passes | 10/10 | 15.0 |
| Test coverage | 0% | 0/10 | 0.0 |
| Comment density | 4.7% | 4.7/10 | 4.7 |
| Average function size | 43 LOC/fn (3104 / 72) | 5.7/10 | 8.5 |
| Dependency health | 1 moderate `npm audit` advisory | 9/10 | 13.5 |
| CI / release hygiene | husky wired, CI valid, publish proven on V11.10.1 | 9/10 | 13.5 |
| **TOTAL** | | | **55.2 / 100** |

### Interpretation

The codebase scores **55/100** by this internal index. The two big drags:

- **Coverage at 0%** is worth 30 points; almost every other dimension is reasonably healthy.
- **Function size at ~43 LOC/fn average** is mid-range; concentrated in input parsers in `gen1-node.js`.

If [R6 (test suite)](06-recommendations-for-refactoring.md#r6-introduce-a-test-suite-l) gets to even 40% coverage, the index would land around **70/100** — a meaningful step. Adding [R1 (file splitting)](06-recommendations-for-refactoring.md#r1-extract-the-per-device-type-input-parsers-into-one-file-each-m) probably brings function-size into the 8/10 range, lifting another 4 points.

A perfect 100 isn't a meaningful target (comment density at 10%+ is arguably _too_ verbose), but the 70-80 band is reachable in one focused refactor cycle.

---

## Commit history

- **Total commits:** 370 (since project inception, ~2019).
- **Commits in the last 12 months:** 72 — roughly 6/month, mostly device-catalog additions and dependabot bumps.
- **Unique authors:** 18 across the project's lifetime.
- **Open issues:** 1 ([#195](https://github.com/windkh/node-red-contrib-shelly/issues/195)).
- **Closed issues:** ~250 over project lifetime — strong responsiveness signal.

## Bundle metrics

- **Package size (tarball):** 61.5 KB packed, 354 KB unpacked at V11.10.1.
- **Files in tarball:** 56.
- **Runtime dependencies:** 3 (`axios`, `axios-rate-limit`, `fastify`) after the 11.9.0 cleanup that removed `crypto` and `path`.
- **Dev dependencies:** 5 (`eslint` + 2 config plugins, `husky`, `prettier`).
- **Engines:** Node `>=20.0.0`, Node-RED `>=3.0.0`.

## Release cadence

| Year | Releases | Notable |
|---|---:|---|
| 2025 | ~22 | gen 4 support landed, fast catalog growth |
| 2024 | ~25 | gen 3 support landed |
| 2026 (YTD May) | 11 | 11.7.x – 11.10.x; the recent quality push |

The project's release cadence is healthy — new device support typically lands within a release cycle of a Shelly product announcement.
