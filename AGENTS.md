# AGENTS.md — node-red-contrib-shelly

<!-- BEGIN node-red-standards:managed (do not edit — run `nrstd sync`) -->

> These shared rules are maintained centrally in **node-red-standards** and refreshed here by
> `nrstd sync`. Do not edit between the managed markers — change the standard instead. Everything
> below the managed block (the "Project-specific rules" section) is yours and is never overwritten.

## Shared: Architecture

- Node packages are modular: `lib/` holds framework-independent, unit-testable core logic;
  `nodes/` holds one file per Node-RED node; `icons/` holds node icons.
- The registered entry file (`<pkg>/99-<name>.js`) is a thin delegator that only `require`s and
  registers the modules in `nodes/`. Keep runtime glue thin.
- Record non-trivial design decisions as an ADR in `doc/architecture/adr/`.

## Shared: Code style

- Lint: ESLint flat config (`eslint.config.js`), ESLint >= 10. Run the lint script before committing.
  `eslint` and `@eslint/js` must stay on the same major: `@eslint/js@10` peers on `eslint@^10`, and
  pairing `eslint@10` with `@eslint/js@9` silently keeps the v9 recommended rule set.
- ESLint 10's recommended set adds `no-unassigned-vars` and `no-useless-assignment`. Both are errors:
  don't declare a binding only to pass `undefined` around, and don't assign a value no later
  statement reads.
- Format: Prettier (`.prettierrc.json`) — 4-space indent, single quotes, es5 trailing commas.
- Target Node.js >= 20.
- Avoid `var` — use `const`, or `let` only when the binding is reassigned (enforced by `no-var` / `prefer-const`).
- One statement per line — don't pack multiple instructions onto a single line; keep lines simple to read (enforced by `max-statements-per-line`).
- Keep functions short, with a single exit:
    - **One exit per function.** A function leaves in exactly one place: its last statement. This
      includes guard clauses — an early `return` in a precondition check is still a second exit and is
      not allowed. Assign to a single result and return it as the last statement. `throw` is the one
      permitted exception, because it is not a return and a `finally` still runs.
    - **Validate by nesting, not by leaving.** State the precondition as the condition that must hold
      and put the work inside it, with the error path in the `else`. Where the caller is code, `throw`
      instead; where the caller is a Node-RED flow, the `else` calls the error path.
    - **Keep functions short enough that the nesting does not matter.** The objection to nesting is
      really an objection to long functions — at a readable length, one or two levels of indentation
      cost nothing. If the nesting starts to hurt, extract a function; never add a second exit.
    - **Most likely case first within each branch**, so a reader meets what the function normally does
      before the exceptions.
    - **If every path must do trailing work, put that work in `finally`** rather than repeating it
      before each exit — combined with the single exit this makes the epilogue unskippable.
- No defensive programming. Do not check for states that cannot occur, and do not guard against
  hypothetical future changes to code you control. Validate input at the boundary and then trust it.

## Shared: Tests

- Node's built-in test runner (`node --test`) + `node-red-node-test-helper`. Tests live in `test/` as `*.test.js`.
  Import `{ describe, it }` from `node:test` and assert with `node:assert`. Coverage via `c8`.
- Node's default discovery runs **every** `.js` under `test/`, whatever it is named, so shared helpers and
  fixtures belong outside that directory (e.g. `test-helpers/`). The test script deliberately takes no path
  arguments: a `'test/**/*.test.js'` glob would need Node >= 21 and fails on Node 20, which is still supported.

## Shared: Documentation

- `README.md` is user-facing. Architecture docs live under `doc/architecture/`
  (`overview.md`, `structural-design.md`, `behavioural-design.md`, `adr/`).
- Update `CHANGELOG.md` (Keep a Changelog style) for every user-visible change; bump the
  patch version in `package.json` in the same commit.

## Shared: Workflow

- CI (`.github/workflows/node.js.yml`) must pass: lint, format:check, test, coverage.
- Releases go through `.github/workflows/npm-publish.yml`.
- Never bump the major version without an ADR explaining the breaking change.

## Shared: package.json scripts

`lint`, `lint:fix`, `format`, `format:check`, `test` (`node --test` with `--test-force-exit --test-timeout=30000 --test-concurrency=1`, no path args), `coverage` / `coverage:check` (c8 over `npm test`).

<!-- END node-red-standards:managed -->

## Project-specific rules

### Project

Node-RED contribution package (`node-red-contrib-shelly`) that provides nodes for controlling Shelly
smart-home devices over local HTTP (gen 1 REST, gen 2+ JSON-RPC) and the Shelly Cloud API.
Distributed via npm; consumed by Node-RED runtimes (>=3.0.0, Node >=20).

### Commands beyond the standard set

- To test changes against a real Node-RED install: `npm link` here, then
  `npm link node-red-contrib-shelly` inside the Node-RED user dir (typically `~/.node-red`), and
  restart Node-RED.
- The husky pre-commit hook runs lint and the test suite; both must pass before a commit lands.

Two paths are excluded from Prettier on purpose (see `.prettierignore`):
`shelly/config/config.json`, because the catalog is hand-aligned data and adding a device is
primarily an edit to that file; and `shelly/scripts/`, because it runs on the device and
`ble-shelly-blu.js` is vendored. `shelly/scripts/` and `coverage/` are also ignored by ESLint.

### Architecture

#### Entry point and registration

[shelly/99-shelly.js](shelly/99-shelly.js) is the Node-RED entry (declared under `node-red.nodes` in
[package.json](package.json)). It:

1. Exposes admin HTTP routes used by the config UI (`/node-red-contrib-shelly-getidevicetypesgen1`,
   `…gen2`, `…getipaddresses`, `…getshellyinfo`) to populate device-type dropdowns and probe a
   hostname.
2. Registers six node types: `shelly-gen1`, `shelly-gen1-server`, `shelly-gen2`,
   `shelly-gen2-server`, `shelly-cloud`, `shelly-cloud-server`. The matching admin-UI definitions
   live in [shelly/99-shelly.html](shelly/99-shelly.html).

The pairing is intentional: each device node references a corresponding **server config node** that
owns shared state — for gen1/gen2 that is the fastify HTTP listener for callbacks; for cloud it holds
the auth key.

#### Three communication paths

The package abstracts three distinct Shelly protocols behind a similar Node-RED message contract
(`msg.payload` in, status object out):

- **Generation 1** ([shelly/nodes/gen1-node.js](shelly/nodes/gen1-node.js)) — REST endpoints like
  `/relay/0?turn=on`, `/light/0?...`, `/settings/...`. Per-device-type input parsers
  (`inputParserRelay1Async`, `inputParserDimmer1Async`, etc.) translate `msg.payload` into a query
  string.
- **Generation 2/3/4** ([shelly/nodes/gen2-node.js](shelly/nodes/gen2-node.js)) — JSON-RPC over HTTP
  (`Switch.Set`, `Light.Set`, `RGBW.Set`, …). Gen 3 and gen 4 share the gen 2 code path; the config
  catalog tags them separately for UI grouping only. Command payloads accept the arguments as either
  `parameters` or `params` — Shelly's own RPC docs use the latter, and only reading the former caused
  [#195](https://github.com/windkh/node-red-contrib-shelly/issues/195).
- **Cloud** ([shelly/nodes/cloud-node.js](shelly/nodes/cloud-node.js)) — calls the Shelly Cloud REST
  API with a user-provided auth key. Rate-limited via `axios-rate-limit` (the cloud caps at ~1
  req/sec; exceeding it yields 401).

[shelly/lib/shelly.js](shelly/lib/shelly.js) is the shared HTTP layer used by gen1 and gen2 nodes. It:

- Issues GETs/POSTs with `axios`.
- Handles **Basic auth** (gen 1) and **Digest auth** (gen 2 — see Shelly's gen2 auth docs;
  nonce/cnonce tracking lives in this file).
- Folds the device's response body into thrown errors, so a gen 2 RPC rejection surfaces the device's
  own reason rather than axios's generic status text.
- Supplies `getShellyInfo` / `getIPAddresses` used by the admin UI.

[shelly/lib/utils.js](shelly/lib/utils.js) holds tiny helpers (payload validity, trim).
[shelly/lib/configuration.js](shelly/lib/configuration.js) reads
[shelly/config/config.json](shelly/config/config.json), which is the **single source of truth** for
the supported-device catalog: `gen1DeviceTypes` / `gen2DeviceTypes` map a device family (`Relay`,
`Dimmer`, `Sensor`, `BluGateway`, …) to model-number prefixes, and the `devices` array enumerates
every concrete model with `gen`, `model`, `type`, and `helpLink`. **Adding support for a new Shelly
model is primarily a `config.json` edit** plus, if its `type` is new, a corresponding input parser in
the gen1 or gen2 node.

#### Polling vs. callback mode

Every device node supports two modes (configured in the UI):

- **Polling** — node periodically GETs `/shelly` (gen1) or `/rpc/Shelly.GetStatus` (gen2+) on a
  user-set interval. Default 5000ms; 0 disables. Hostname can be left blank, in which case the node
  expects `msg.payload.hostname` per call (useful for subflow templates).
- **Callback** — the node opens a fastify HTTP listener (the **server config node** does this; see
  [shelly/nodes/gen1-server-node.js](shelly/nodes/gen1-server-node.js) and
  [shelly/nodes/gen2-server-node.js](shelly/nodes/gen2-server-node.js)). It then provisions the
  device to push events to that listener:
    - **Gen 1** uses Shelly's built-in _webhooks_ (limited; some devices like sensors only wake
      intermittently — the node retries webhook install on each wake).
    - **Gen 2+** uploads a Node-RED-aware notification script. The template is
      [shelly/scripts/callback.js](shelly/scripts/callback.js); for BLU bridging the device
      additionally runs [shelly/scripts/ble-shelly-blu.js](shelly/scripts/ble-shelly-blu.js)
      (Apache 2.0, vendored from `ALLTERCO/shelly-script-examples`).

Callback mode requires the device to be able to reach Node-RED, so when Node-RED runs in
Docker/bridged networks the server config node exposes a hostname/IP override.

#### BLU (Bluetooth) devices

BLU devices have no IP — they are reached via a gen2+ device acting as a bluetooth gateway. Activate
this by enabling callback mode + the BLU/gateway checkbox on the server config node, which causes the
BLU scanning script to be uploaded alongside the callback script. BLU events arrive on the gateway
node with `msg.payload.info.event === "shelly-blu"` and a MAC at `msg.payload.info.data.address`.
Payloads are decoded BTHomeV2.

### Conventions

- The `shelly/scripts/` JS runs on the Shelly device's mJS runtime, not Node — do not import Node
  modules there or apply Node idioms.
- The BLU scanner is kept as **two files**.
  [ble-shelly-blu.js](shelly/scripts/ble-shelly-blu.js) is the one that is uploaded and is
  comment-stripped on purpose: `Script.PutCode` sends 1024-byte chunks, so every comment costs RPC
  calls on a device that rate-limits. [ble-shelly-blu-with-comments.js](shelly/scripts/ble-shelly-blu-with-comments.js)
  is the readable twin — nothing uploads it, and it exists so the rationale is not lost with the
  comments. Change the commented file first, then re-strip; keep them behaviourally identical.
- Both are vendored from `ALLTERCO/shelly-script-examples` but are **not** a verbatim copy: they
  carry a local patch to the BLE-enabled check in `init()`, because firmware 2.0.0 removed the
  `ble.enable` flag the upstream guard tests and upstream has not adapted
  ([#261](https://github.com/windkh/node-red-contrib-shelly/issues/261)). Re-vendoring means
  re-applying that patch. The `LOCAL PATCH` marker survives only in the commented twin — in the
  uploaded file the guard is bare code, so
  [test/unit/ble-blu-script.test.js](test/unit/ble-blu-script.test.js), which runs the uploaded
  script under stubbed device globals and fails if the patch is dropped, is the real safeguard.
- When adding a new device, prefer extending
  [shelly/config/config.json](shelly/config/config.json) and reusing an existing `type` so the input
  parser is already wired. If a genuinely new behavior is needed, add a parser in the matching
  gen1/gen2 node and (for gen1) a model-prefix entry in `gen1DeviceTypes` / (for gen2+) in
  `gen2DeviceTypes`.
- Example flows ship under [examples/](examples/) and are referenced from [README.md](README.md);
  when you add a device behavior, add a matching `examples/*.json` so users can import it.
- `examples/` is published in the npm tarball because Node-RED reads it from the installed package to
  populate the editor's _Import → Examples_ menu. Keep it in the `files` allowlist.
