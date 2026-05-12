# 010 — The BLU scanner script is vendored from `ALLTERCO/shelly-script-examples`

- **Status:** Accepted
- **Date:** ~2023

## Context

When BLU support landed (see [ADR-006](006-blu-via-gen2-gateway.md)), the package needed a Bluetooth-advertisement scanner running on the gateway device. Writing a correct BTHomeV2 parser in mJS (the Shelly device's JavaScript subset) is non-trivial — payload decoding, encryption handling, type maps, signed/unsigned/scaling per field.

Shelly themselves maintain a reference implementation in [`ALLTERCO/shelly-script-examples`](https://github.com/ALLTERCO/shelly-script-examples) — Apache 2.0 licensed. It's about 10 KB of mJS, BTHomeV2-compliant, and known to work on every gen 2+ device with Bluetooth.

The options:

- (A) Write a Node-RED-specific BLU scanner from scratch.
- (B) Add the ALLTERCO repo as a runtime dependency (impossible — scripts ship on the device, not in Node).
- (C) Vendor the script verbatim into this repo and ship it in the npm package.

## Decision

**(C).** [`shelly/scripts/ble-shelly-blu.js`](../../../shelly/scripts/ble-shelly-blu.js) is a verbatim copy of the upstream script. The file header carries the Apache 2.0 license notice and a reference to the upstream URL. The README credits the original authors.

When a user enables BLU support on a gateway node, this file is read from disk by [`gen2-node.js`](../../../shelly/nodes/gen2-node.js)'s `initializer2BluCallbackAsync`, passed to `tryInstallScriptAsync`, and uploaded as a second device-side script named `node-red-contrib-shelly-blu`.

The lint config excludes `shelly/scripts/` (`--ignore-pattern scripts`) so our formatter doesn't mangle upstream code.

## Consequences

**Positive:**

- BTHomeV2 decoding is correct out of the box. No reinvention.
- Upstream improvements (new BLU device types, encryption fixes) can be pulled in by a verbatim file replacement.
- The Apache 2.0 license is permissive enough to bundle in an MIT-licensed package, with attribution.

**Negative:**

- Manual sync: we don't automatically track upstream changes. If Shelly releases a new BLU device with an unrecognised type code, this package won't decode it until someone vendors the new version.
- The file is treated as opaque — we can't safely modify it without risking divergence from upstream. Customisation has to happen in the wrapping callback script, not in the scanner.
- License notice is responsibility of every contributor: removing or mangling the Apache 2.0 header would put the project in violation.

**Locks us into:**

- A vendor-and-sync model for any future device-side reference scripts. The same pattern would apply to e.g. a Modbus bridge or Zigbee bridge if those scripts emerged from ALLTERCO.
