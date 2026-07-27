# 006 — BLU devices addressed through a gen 2+ gateway, not directly

- **Status:** Accepted
- **Date:** ~2023 (when BLU support landed)

## Context

The Shelly **BLU** line (BLU Button, BLU Door/Window, BLU H&T, …) communicates via Bluetooth Low Energy. These devices have no IP address, no WiFi, no HTTP endpoint. They broadcast BTHomeV2-formatted advertisements over BLE; that's it.

Node-RED runs on machines that may or may not have a Bluetooth radio (most servers don't). Even if they do, BLE scanning is awkward across OSes and Node versions, and would require native bindings.

But many Shelly gen 2+ devices (Plus 1, Plus 1 PM, Pro 1, Wall Display, BluGateway, …) have built-in Bluetooth radios and can run scripts. So they can scan for BLU advertisements locally and forward what they hear to Node-RED.

## Decision

Treat BLU devices as a **logical extension of a gen 2+ device acting as gateway**. There is no `shelly-blu` node type. Instead:

- The user picks a gen 2+ device with Bluetooth (Plus 1, Pro 1, Wall Display, etc., or the explicit ShellyBLU Gateway model).
- They configure that device node in callback mode and tick the BLU/gateway checkbox.
- The package uploads two scripts: the standard [`callback.js`](../../../shelly/scripts/callback.js) **and** [`ble-shelly-blu.js`](../../../shelly/scripts/ble-shelly-blu.js) (the BLU scanner).
- BLU events arrive on the gateway node with `msg.payload.info.event === "shelly-blu"` and the BLU device's MAC address at `msg.payload.info.data.address`.

The user filters by MAC in their flow to dispatch to per-BLU-device logic.

For the explicit **ShellyBLU Gateway** product (model `SNGW-BT01` / `S3GW-1DBT001`), the BLU script is auto-uploaded; the user doesn't need to tick the checkbox.

## Consequences

**Positive:**

- Zero infrastructure on the Node-RED host — no BLE stack, no native modules, no OS-specific scanning.
- One gen 2+ device can gateway dozens of BLU devices within its radio range.
- Aligns with how the official Shelly app handles BLU devices.

**Negative:**

- The BLU "node" is conceptually a sub-noun of a gateway node, not a first-class node. Users have to think in two layers: "which gateway hears my BLU button, and how do I filter by MAC in the downstream flow?"
- A BLU device that wanders out of range of its gateway goes silent with no notification. No automatic gateway-switching even if multiple gateways are present.
- No way to send commands _to_ BLU devices that have actuators (most don't, but BLU buttons do — they could in principle receive haptic feedback). The current path is receive-only.

**Locks us into:**

- BLU support is always tied to having at least one gen 2+ device in the deployment. A pure-BLU + Node-RED-with-Bluetooth setup is not on the roadmap.
