# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Node-RED contribution package (`node-red-contrib-shelly`) that provides nodes for controlling Shelly smart-home devices over local HTTP (gen 1 REST, gen 2+ JSON-RPC) and the Shelly Cloud API. Distributed via npm; consumed by Node-RED runtimes (>=3.0.0, Node >=16).

## Commands

- `npm install` — install dependencies
- `npm run lint` — ESLint over `shelly/` (excludes `shelly/scripts`). The husky pre-commit hook runs this; lint must pass before commits land.
- No test suite exists. The `npm test` step is commented out in [.github/workflows/node.js.yml](.github/workflows/node.js.yml); CI only runs `npm ci`.
- To test changes against a real Node-RED install: `npm link` here, then `npm link node-red-contrib-shelly` inside the Node-RED user dir (typically `~/.node-red`), and restart Node-RED.

Formatting is governed by [.prettierrc](.prettierrc) (4-space indent, single quotes, 160 print width, semicolons). The ESLint config wires Prettier in as an error-level rule, so `npm run lint` also flags formatting drift.

## Architecture

### Entry point and registration

[shelly/99-shelly.js](shelly/99-shelly.js) is the Node-RED entry (declared under `node-red.nodes` in [package.json](package.json)). It:
1. Exposes admin HTTP routes used by the config UI (`/node-red-contrib-shelly-getidevicetypesgen1`, `…gen2`, `…getipaddresses`, `…getshellyinfo`) to populate device-type dropdowns and probe a hostname.
2. Registers six node types: `shelly-gen1`, `shelly-gen1-server`, `shelly-gen2`, `shelly-gen2-server`, `shelly-cloud`, `shelly-cloud-server`. The matching admin-UI definitions live in [shelly/99-shelly.html](shelly/99-shelly.html).

The pairing is intentional: each device node references a corresponding **server config node** that owns shared state — for gen1/gen2 that is the fastify HTTP listener for callbacks; for cloud it holds the auth key.

### Three communication paths

The package abstracts three distinct Shelly protocols behind a similar Node-RED message contract (`msg.payload` in, status object out):

- **Generation 1** ([shelly/nodes/gen1-node.js](shelly/nodes/gen1-node.js)) — REST endpoints like `/relay/0?turn=on`, `/light/0?...`, `/settings/...`. Per-device-type input parsers (`inputParserRelay1Async`, `inputParserDimmer1Async`, etc.) translate `msg.payload` into a query string.
- **Generation 2/3/4** ([shelly/nodes/gen2-node.js](shelly/nodes/gen2-node.js)) — JSON-RPC over HTTP (`Switch.Set`, `Light.Set`, `RGBW.Set`, …). Gen 3 and gen 4 share the gen 2 code path; the config catalog tags them separately for UI grouping only.
- **Cloud** ([shelly/nodes/cloud-node.js](shelly/nodes/cloud-node.js)) — calls the Shelly Cloud REST API with a user-provided auth key. Rate-limited via `axios-rate-limit` (the cloud caps at ~1 req/sec; exceeding it yields 401).

[shelly/lib/shelly.js](shelly/lib/shelly.js) is the shared HTTP layer used by gen1 and gen2 nodes. It:
- Issues GETs/POSTs with `axios`.
- Handles **Basic auth** (gen 1) and **Digest auth** (gen 2 — see Shelly's gen2 auth docs; nonce/cnonce tracking lives in this file).
- Supplies `getShellyInfo` / `getIPAddresses` used by the admin UI.

[shelly/lib/utils.js](shelly/lib/utils.js) holds tiny helpers (payload validity, trim). [shelly/lib/configuration.js](shelly/lib/configuration.js) reads [shelly/config/config.json](shelly/config/config.json), which is the **single source of truth** for the supported-device catalog: `gen1DeviceTypes` / `gen2DeviceTypes` map a device family (`Relay`, `Dimmer`, `Sensor`, `BluGateway`, …) to model-number prefixes, and the `devices` array enumerates every concrete model with `gen`, `model`, `type`, and `helpLink`. **Adding support for a new Shelly model is primarily a `config.json` edit** plus, if its `type` is new, a corresponding input parser in the gen1 or gen2 node.

### Polling vs. callback mode

Every device node supports two modes (configured in the UI):

- **Polling** — node periodically GETs `/shelly` (gen1) or `/rpc/Shelly.GetStatus` (gen2+) on a user-set interval. Default 5000ms; 0 disables. Hostname can be left blank, in which case the node expects `msg.payload.hostname` per call (useful for subflow templates).
- **Callback** — the node opens a fastify HTTP listener (the **server config node** does this; see [shelly/nodes/gen1-server-node.js](shelly/nodes/gen1-server-node.js) and [shelly/nodes/gen2-server-node.js](shelly/nodes/gen2-server-node.js)). It then provisions the device to push events to that listener:
  - **Gen 1** uses Shelly's built-in *webhooks* (limited; some devices like sensors only wake intermittently — the node retries webhook install on each wake).
  - **Gen 2+** uploads a Node-RED-aware notification script. The template is [shelly/scripts/callback.js](shelly/scripts/callback.js); for BLU bridging the device additionally runs [shelly/scripts/ble-shelly-blu.js](shelly/scripts/ble-shelly-blu.js) (Apache 2.0, vendored from `ALLTERCO/shelly-script-examples`).

Callback mode requires the device to be able to reach Node-RED, so when Node-RED runs in Docker/bridged networks the server config node exposes a hostname/IP override. The `shelly/scripts/` directory is excluded from lint (`--ignore-pattern scripts`) because it is executable on the device, not Node.

### BLU (Bluetooth) devices

BLU devices have no IP — they are reached via a gen2+ device acting as a bluetooth gateway. Activate this by enabling callback mode + the BLU/gateway checkbox on the server config node, which causes the BLU scanning script to be uploaded alongside the callback script. BLU events arrive on the gateway node with `msg.payload.info.event === "shelly-blu"` and a MAC at `msg.payload.info.data.address`. Payloads are decoded BTHomeV2.

## Conventions

- Use `let` / `const`; `no-var` is enforced.
- Single quotes, trailing commas (`es5`), semicolons required.
- The `shelly/scripts/` JS runs on the Shelly device's mJS runtime, not Node — do not import Node modules there or apply Node idioms.
- When adding a new device, prefer extending [shelly/config/config.json](shelly/config/config.json) and reusing an existing `type` so the input parser is already wired. If a genuinely new behavior is needed, add a parser in the matching gen1/gen2 node and (for gen1) a model-prefix entry in `gen1DeviceTypes` / (for gen2+) `gen2DeviceTypes`.
- Example flows ship under [examples/](examples/) and are referenced from [README.md](README.md); when you add a device behavior, add a matching `examples/*.json` so users can import it.
