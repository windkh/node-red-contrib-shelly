# 004 — Callbacks via uploaded scripts (gen 2+) vs. built-in webhooks (gen 1)

- **Status:** Accepted
- **Date:** ~2022 (when gen 2 support landed)

## Context

Generation 1 firmware supports a limited set of built-in webhooks (`/settings/actions`): the device can be configured to call a URL on a fixed list of events (relay toggled, button pressed, etc.). Custom event filtering or formatting is not possible — the device sends what it sends.

Generation 2+ firmware exposes a **mJS scripting runtime** on the device itself. The controller can upload arbitrary JavaScript that subscribes to internal events and decides what to forward. The mJS runtime has the device's full API but lacks Node modules, npm, or anything you'd expect from server-side JS.

Both can serve the callback role. Gen 1 has to use webhooks (no scripts). Gen 2 _could_ use either: it also supports the gen 1-style webhooks, but scripts are more flexible.

## Decision

Use the natural mechanism for each:

- **Gen 1:** install webhooks via `GET /settings/actions?index=N&name=<action>&urls[]=<url>`. The list of available actions is fetched from the device via `GET /settings/actions` and iterated.
- **Gen 2+ relays, dimmers, buttons, RGBW, BLU gateways:** upload [`shelly/scripts/callback.js`](../../../shelly/scripts/callback.js) via the `Script.*` RPC family. The script forwards every notification event to the Node-RED listener.
- **Gen 2 sensors specifically:** fall back to webhooks (`tryInstallWebhook2Async`). Sensors typically don't support persistent scripts because they sleep.

## Consequences

**Positive:**

- Each generation uses the most expressive mechanism it supports. Gen 2 callbacks include rich event payloads (whole status objects, BLU advertisements, custom events from BLU bridging).
- The uploaded script is _templated_ at upload time with the target URL and the sender hostname (`%URL%` / `%SENDER%` substitutions), so multiple Node-REDs can target the same device fleet from different IPs without conflict.

**Negative:**

- Script management requires more RPC calls than webhook install (Stop → Delete → Create → PutCode in 1KB chunks → SetConfig → Start → GetStatus). More moving parts, more places to fail.
- The device-side script lives in a different language ecosystem (mJS) — it's lint-excluded (`--ignore-pattern scripts`) because Node tooling can't parse its idioms.
- Upgrading the callback script for an existing user's device fleet requires a re-deploy / re-init — the old script keeps running until the node uninstalls it.
- Webhooks on gen 1 sensors are flaky: the sensor is usually asleep, so webhook install has to retry on every wake. This is handled but adds complexity in `tryInstallWebhook1Async`.

**Locks us into:**

- A literal text-substitution templating layer (`%URL%`/`%SENDER%`) for the callback script. Anything more complex (multiple endpoints, conditional logic) would push us toward a real templater, or — better — moving the script to a fixed text and parameterising via the device's script config blob.
