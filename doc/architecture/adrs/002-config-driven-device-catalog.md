# 002 — Device catalog as data, not code

- **Status:** Accepted
- **Date:** ~2021 (catalog file first appears in this form around the `config/` refactor)

## Context

Shelly has shipped 123 device models so far and continues adding more. Each model has a model-number prefix (`SHSW-`, `SNSW-`, `S3SH-`, …), a device-family classification (Relay, Dimmer, Sensor, …), a generation, and a help link.

If support for each model required code changes, every new product release would require a PR with logic changes — and reviewers would have to verify that adding model X doesn't break model Y. The model count grows roughly linearly with Shelly's release cadence.

## Decision

Encode the entire catalog in [`shelly/config/config.json`](../../../shelly/config/config.json) as data, and treat code as the (rarely-changed) interpreter of that data. The file has three sections:

- `gen1DeviceTypes` / `gen2DeviceTypes`: family → list of model-number prefixes.
- `devices`: every concrete model with `gen`, `model`, `type`, `helpLink`, `supported`.

Code in [`shelly/lib/configuration.js`](../../../shelly/lib/configuration.js) reads this file once at load time and exposes lookup helpers.

## Consequences

**Positive:**

- **Adding a new model is usually a single-line JSON edit.** No code review of logic, no risk of breaking other devices.
- The catalog is greppable, diffable, and visible at-a-glance.
- The editor dropdown is populated from the same data the runtime uses — no risk of UI/runtime drift.

**Negative:**

- Genuinely new device behaviours (e.g., when "BluGateway" was added) still require new code in the input parser dispatch and the family→prefix maps. The data-only approach masks this until you hit it.
- The single-source-of-truth file has no schema validation — typos in `gen` or `type` aren't caught at load time, only when a user tries to use the device.

**Locks us into:**

- Carrying the catalog inline in the npm package. The tarball includes `config.json`, so users automatically get new device support on upgrade — but they can't pick up _just_ new device support without upgrading the whole package.
