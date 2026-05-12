# 02 · Structural Design

## Source tree

```
shelly/
├── 99-shelly.js          Node-RED entry; registers all 6 node types + admin routes
├── 99-shelly.html        Admin-UI definitions for the editor (forms, dropdowns)
├── config/
│   └── config.json       Single source of truth for the device catalog
├── lib/
│   ├── shelly.js         Shared HTTP transport, auth, polling lifecycle
│   ├── configuration.js  Catalog lookups (model → type, gen → device list)
│   └── utils.js          Small helpers (payload validity, trim, replace)
├── nodes/
│   ├── gen1-node.js        }
│   ├── gen1-server-node.js } paired: device node + fastify-listener config
│   ├── gen2-node.js        }
│   ├── gen2-server-node.js }
│   ├── cloud-node.js       }
│   └── cloud-server-node.js}
├── scripts/                Device-side JS, runs on Shelly's mJS runtime (not Node)
│   ├── callback.js         Forwards events from gen2+ device to Node-RED listener
│   └── ble-shelly-blu.js   BLU scanner for gen2+ gateway devices (vendored, Apache 2.0)
└── icons/                  Three PNG icons used in the Node-RED palette
```

```
examples/                  28 importable Node-RED flow JSONs (one per device family)
.github/workflows/         CI (lint matrix) + npm-publish (on release)
.husky/                    Pre-commit lint gate
doc/architecture/          This documentation
```

## Module dependency graph

```
                 ┌──────────────────┐
                 │   99-shelly.js   │  (entry, registers all node types)
                 └────────┬─────────┘
                          │ requires
        ┌─────────────────┼─────────────────────────┐
        ▼                 ▼                         ▼
┌──────────────┐  ┌───────────────────┐  ┌────────────────────┐
│ lib/utils    │  │   lib/shelly      │  │ lib/configuration  │
│  (helpers)   │  │  (HTTP, auth,     │  │  (model→type maps, │
│              │  │   polling loop)   │  │   gen catalogs)    │
└────────▲─────┘  └────────▲──────────┘  └────────▲───────────┘
         │                 │                       │
         │                 │   (used by all node types)
         │                 │                       │
         └────────┬────────┴───────────────────────┘
                  │
   ┌──────────────┼──────────────┬──────────────┐
   ▼              ▼              ▼              ▼
┌─────────┐  ┌─────────┐    ┌─────────┐    ┌──────────────────┐
│ gen1-   │  │ gen2-   │    │ cloud-  │    │ *-server-node.js │
│ node.js │  │ node.js │    │ node.js │    │ (fastify listener │
└─────────┘  └─────────┘    └─────────┘    │  or cloud creds)  │
                                            └──────────────────┘
```

**Key observations:**

- `lib/` is the only horizontal layer. Everything else above it is a "leaf" that depends on `lib/` but not on its sibling.
- There are **no cycles** in the require graph.
- The three protocol paths (gen1 / gen2 / cloud) are siblings. They share `lib/utils` and `lib/configuration`; gen1 and gen2 also share `lib/shelly` (cloud uses its own axios + rate-limiter and skips the shared transport).
- Cloud is the most isolated branch — its only `lib/` dependency is `utils`.

## Per-file roles

### Entry and registration

[`99-shelly.js`](../../shelly/99-shelly.js) (104 LOC) is the Node-RED entry, declared under `node-red.nodes` in [package.json](../../package.json). It does three things:

1. **Logs the package version** at load time (`pkg.version`).
2. **Mounts four HTTP admin routes** used by the config editor to populate dropdowns: `getidevicetypesgen1`, `getidevicetypesgen2` (which actually concatenates gen 2, 3, 4), `getipaddresses`, `getshellyinfo`.
3. **Registers the six node types** with their credential schemas (gen 1/2 have username/password; servers have a `token`; cloud-server has `serveruri` + `authkey`).

[`99-shelly.html`](../../shelly/99-shelly.html) (~1300 LOC) holds the editor-side UI for those six types — form definitions, the dropdown population script, the field validators.

### Shared library

[`lib/shelly.js`](../../shelly/lib/shelly.js) (430 LOC) is the HTTP transport layer for gen1 and gen2+. Notable members:

- `shellyRequestAsync` — generic axios wrapper; transparent retry on 401 with HTTP Digest auth (gen2+); error enrichment with the device's response body (since 11.10.1).
- `getDigestAuthorization` — RFC 7616-flavour digest builder; consumes the `www-authenticate` challenge and builds the next `Authorization` header.
- `shellyPing` / `tryCheckDeviceType` — reachability check + device-type assertion (used at init and on every poll tick).
- `start` / `startAsync` — polling loop; sets up the `setInterval` and emits `msg.error` on transitions to offline.
- `getIPAddresses`, `getShellyInfo` — used by admin routes only.

[`lib/configuration.js`](../../shelly/lib/configuration.js) (172 LOC) is the catalog-lookup module. It reads [`config/config.json`](../../shelly/config/config.json) once at load and exposes:

- `getDeviceTypeInfos(gen)` — flat list of `{deviceType, description}` for the editor dropdown.
- `getDeviceType(model)` / `getDevice(model)` — model → type / model → full entry.
- `getDeviceTypes1` / `getDeviceTypes2` — given a device-family ("Relay", "Dimmer", "Sensor", "BluGateway", …), return the model-number prefixes to match.
- `isExactTypeGen1` / `isExactTypeGen2` — does this token name a family or a concrete model?

[`lib/utils.js`](../../shelly/lib/utils.js) (51 LOC) holds small helpers: `isMsgPayloadValid`, `isMsgPayloadValidOrArray`, `isEmpty`, `trim`, `replace`. No state, no I/O.

### Nodes

[`nodes/gen1-node.js`](../../shelly/nodes/gen1-node.js) (1342 LOC, the largest file in the codebase) is the gen 1 device implementation. Its size comes from carrying **eight per-device-family input parsers** (Relay, Measure, Roller, Dimmer, Thermostat, Sensor, Button, RGBW), each translating `msg.payload` into a REST query string like `/relay/0?turn=on&timer=5`. It also owns:

- `tryInstallWebhook1Async` / `tryUninstallWebhook1Async` — gen 1 callback support via the device's built-in `/settings/actions` webhooks.
- `applySettings1Async` — generic `/settings/...` path for arbitrary device settings.
- `convertStatus1` — extracts the interesting fields from `/status` into a slimmer object surfaced as `msg.payload`.
- `getInitializer1` / `getInputParser1` — function-table dispatch on device family.
- The `ShellyGen1Node` constructor.

[`nodes/gen2-node.js`](../../shelly/nodes/gen2-node.js) (703 LOC) is the gen 2/3/4 device implementation. Smaller than gen 1 because the JSON-RPC envelope is uniform — `inputParserGeneric2` handles every command type with a single shape. The bulk of the file is **script / webhook lifecycle**: `tryInstallScriptAsync`, `tryUninstallScriptAsync`, `tryInstallWebhook2Async`, `tryUninstallWebhook2Async`, plus four `initializer*` variants (`polling`, `Callback`, `BluCallback`, `Webhook`) wired by `getInitializer2`. Same `ShellyGen2Node` constructor pattern as gen 1.

[`nodes/cloud-node.js`](../../shelly/nodes/cloud-node.js) (164 LOC) is by far the smallest device implementation — it's a thin REST wrapper around the Shelly Cloud control API. Uses [`axios-rate-limit`](https://github.com/aishek/axios-rate-limit) capped at 1 request per second (the cloud's hard rate limit).

The three `*-server-node.js` files are config-node skeletons:

- [`gen1-server-node.js`](../../shelly/nodes/gen1-server-node.js) (55 LOC) and [`gen2-server-node.js`](../../shelly/nodes/gen2-server-node.js) (58 LOC) spawn a [fastify](https://www.fastify.io/) listener on a user-configured port and emit a `callback` event whenever the device hits them. gen1 wires the `/webhook` route; gen2 wires both `/callback` (script-driven) and `/webhook` (gen2-style webhooks for sensors).
- [`cloud-server-node.js`](../../shelly/nodes/cloud-server-node.js) (25 LOC) just stores the cloud URI + auth key. No listener.

### Device-side scripts

The two files in `shelly/scripts/` (345 LOC combined) are **not Node.js code**. They run on Shelly's embedded mJS interpreter — a JavaScript subset with no `require`, no Node modules, only the device's built-in `Shelly.*` API. The lint config explicitly excludes this directory (`--ignore-pattern scripts`).

- [`callback.js`](../../shelly/scripts/callback.js) — uploaded onto every gen2+ device in callback mode. Subscribes to device events (input clicks, switch state changes, BLU advertisements forwarded by the BLU scanner) and POSTs them to the Node-RED fastify listener.
- [`ble-shelly-blu.js`](../../shelly/scripts/ble-shelly-blu.js) — vendored verbatim from [`ALLTERCO/shelly-script-examples`](https://github.com/ALLTERCO/shelly-script-examples). Scans for BTHomeV2-formatted Bluetooth advertisements and emits them as events the callback script picks up.

## Device catalog as a data layer

[`config/config.json`](../../shelly/config/config.json) (30 KB, 123 device entries) is the single source of truth for which devices the package supports. Its top-level shape:

```jsonc
{
  "gen1DeviceTypes": [        // family → model-number prefixes (for matching)
    ["Relay",      ["SHSW-", "SHPLG-", "SHUNI-", "SHEM", "SHPLG2-"]],
    ...
  ],
  "gen2DeviceTypes": [        // same, covering gen 2/3/4
    ["Relay",      ["SNSW-", "SPSW-", "SPSH-", ...]],
    ...
  ],
  "devices": [                // every concrete model
    { "gen": "1", "name": "Shelly 1", "model": "SHSW-1", "type": "Relay",
      "helpLink": "...", "supported": "true" },
    ...
  ]
}
```

The current breakdown by generation:

| Generation | Models in catalog |
|---|---:|
| Gen 1 | 34 |
| Gen 2 | 52 |
| Gen 3 | 24 |
| Gen 4 | 13 |
| **Total** | **123** |

**This is the key architectural lever for extensibility:** adding a new Shelly model is almost always _just_ adding an entry here. New code is only needed when the device introduces a fundamentally new behaviour family (e.g. when "BluGateway" was added).

## Boundaries

- **Node-RED runtime ↔ this package:** through the [Node-RED node API](https://nodered.org/docs/creating-nodes/) — `RED.nodes.registerType`, `RED.httpAdmin.get`, `node.on('input'/'close')`, `node.send`, `node.status`, `node.warn`/`error`. No other contact points.
- **Package ↔ Shelly device (local):** HTTP (gen1 REST, gen2 JSON-RPC). HTTPS is not used for local LAN access — Shelly devices on LAN do not present TLS certs.
- **Package ↔ Shelly cloud:** HTTPS to a user-supplied `serverUri` with `auth_key=...` in the body, rate-limited.
- **Device ↔ package (callback direction):** outbound HTTP from device to a fastify listener inside Node-RED. Requires that the device can reach Node-RED — when Node-RED is in Docker / bridged net, the server config node has a hostname/IP override.
- **Package ↔ npm registry:** only at install time (no runtime fetches).
