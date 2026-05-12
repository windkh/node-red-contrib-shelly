# 01 · Overview

## What this package is

`node-red-contrib-shelly` is a [Node-RED](https://nodered.org) contribution package that exposes nodes for controlling [Shelly](https://www.shelly.com/) smart-home devices. It is distributed via [npm](https://www.npmjs.com/package/node-red-contrib-shelly) and consumed at runtime by a Node-RED installation (>= 3.0.0, Node >= 20).

The package supports three distinct ways of talking to Shelly hardware:

1. **Generation 1 devices** over the legacy REST API (`/relay/0?turn=on`, `/settings/...`).
2. **Generation 2, 3 and 4 devices** over JSON-RPC (`POST /rpc` with `{id, method, params}`).
3. **Shelly Cloud** for devices that are not on the local LAN.

A fourth path — **Bluetooth (BLU) devices** — piggybacks on the gen2+ path: a gen2+ device with Bluetooth radio acts as a gateway and forwards BLU events to Node-RED via an uploaded script.

## What problem it solves

Shelly's own ecosystem (the Shelly app, the cloud, MQTT integration) is great for end-users but awkward to weave into bespoke automations. Node-RED is the lingua franca for those automations. This package bridges the two:

- One Node-RED node per physical device — drop it on the canvas, point it at a hostname, pick a device type.
- Uniform message contract: `msg.payload` in, status object out.
- Both directions: control commands flow from Node-RED to the device; events (relay clicks, sensor readings, BLU advertisements) flow back into Node-RED.

## How it fits into the Node-RED runtime

```
              ┌──────────────────────────────┐
              │     Node-RED runtime          │
              │                               │
   flows ◄──► │   shelly-gen1   ◄────┐        │
              │   shelly-gen2   ◄────┤        │
              │   shelly-cloud  ◄────┤        │
              │                      │        │
              │   shelly-gen1-server │        │
              │   shelly-gen2-server │        │
              │   shelly-cloud-server│        │
              └──────────────────────┼────────┘
                                     │
              HTTP / JSON-RPC / Cloud │
                                     ▼
                              ┌─────────────┐
                              │ Shelly      │
                              │ device      │
                              │ (LAN/cloud) │
                              └─────────────┘
```

Six Node-RED node types are registered, in three pairs: a **device node** plus its **server config node**. The pairing carries shared state — the server config owns the fastify HTTP listener that receives device callbacks (gen1/gen2) or the auth key for the cloud API.

## Distribution and lifecycle

- **Source of truth:** [github.com/windkh/node-red-contrib-shelly](https://github.com/windkh/node-red-contrib-shelly), `master` branch.
- **Published artifact:** [npmjs.com/package/node-red-contrib-shelly](https://www.npmjs.com/package/node-red-contrib-shelly).
- **Release flow:** push to master → tag `V<semver>` → publish a GitHub Release → `.github/workflows/npm-publish.yml` fires and runs `npm publish`.
- **Versioning:** loose semver. Bug fixes are patches; behavioural changes are minors; engine requirements bumps and big breakages are also typically minors.

## Scope and non-goals

In scope:

- All Shelly device families currently produced (Gen 1 – Gen 4 plus the BLU line over a gateway). The catalog is data-driven by [shelly/config/config.json](../../shelly/config/config.json) — adding a new model is mostly a JSON edit.
- Both local control (LAN) and remote control (Shelly Cloud).
- Polling and event-driven (callback) modes.

Out of scope:

- MQTT control — Shelly's MQTT support is fully native; users wire that up with built-in Node-RED MQTT nodes.
- Firmware updates / device provisioning — too device-specific and risky to wrap.
- A vendor-neutral "smart switch" abstraction — by design, this package is Shelly-shaped.

## Quick-orient cheat sheet

| You want to … | Look at |
|---|---|
| Add support for a new model | [shelly/config/config.json](../../shelly/config/config.json) — usually an entry plus a model-prefix tag |
| Understand the Node-RED entry point | [shelly/99-shelly.js](../../shelly/99-shelly.js) |
| Trace a gen1 input command | `inputParserRelay1Async` etc. in [shelly/nodes/gen1-node.js](../../shelly/nodes/gen1-node.js) |
| Trace a gen2+ input command | `inputParserGeneric2` in [shelly/nodes/gen2-node.js](../../shelly/nodes/gen2-node.js) |
| Understand auth handling | `shellyRequestAsync` + `getDigestAuthorization` in [shelly/lib/shelly.js](../../shelly/lib/shelly.js) |
| Understand callback-mode scripts | [shelly/scripts/callback.js](../../shelly/scripts/callback.js) and [shelly/scripts/ble-shelly-blu.js](../../shelly/scripts/ble-shelly-blu.js) |
