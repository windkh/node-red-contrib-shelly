# 003 — Two operating modes: polling and callback

- **Status:** Accepted
- **Date:** ~2021

## Context

Shelly devices expose two ways for an external controller to learn about state changes:

- **Active polling:** issue a periodic GET to `/shelly` or `/rpc/Shelly.GetStatus` and diff.
- **Passive events:** the device pushes events to a controller URL via webhooks (gen 1) or an uploaded script (gen 2+).

Polling is simple, works through restrictive firewalls (Node-RED-initiated), and is universal across devices. But it's latency-bound by the poll interval (default 5s), it wakes battery-powered sensors needlessly, and it generates network chatter that's wasteful at scale.

Callbacks are event-driven (near-zero latency), don't wake the device, and scale linearly with event rate rather than device count. But they require the device to be able to reach Node-RED, which is non-trivial when Node-RED is in Docker / behind NAT / on a different subnet.

Neither mode is strictly better. Use case decides.

## Decision

Both modes are first-class. The user picks one per device in the editor:

- **Polling mode:** node sets up a `setInterval(pollInterval)` calling `shellyPing`. Hostname can be blank if the user wants to pass it per-message.
- **Callback mode:** the node enrols the device with the server config node's fastify listener (uploaded script for gen 2+, webhook entries for gen 1 / sensors).

`pollInterval: 0` disables polling. The default is 5000ms.

## Consequences

**Positive:**

- Power users get callbacks; casual users get polling. Both are exercised in the example flows.
- Polling-only deployments don't need the server config node, so the simplest possible setup is "one device node, hostname, done."

**Negative:**

- Two code paths per generation means double the lifecycle code to maintain (callback install / uninstall + retry loop, vs. polling loop). The `getInitializer1/2` function table hides this somewhat, but it's still ~half the LOC in each device-node file.
- "Why isn't it working?" support load — the misconfiguration where callback mode is selected without binding a server config node was silently downgrading to polling until 11.10.0 made it visible.
- Battery sensors don't fit either mode cleanly. They _can't_ respond to polling (they're asleep), and callback enrolment has to retry every time they wake up. The gen 1 webhook installer retries on every poll cycle to compensate.

**Locks us into:**

- A bistable user-experience model. A future "auto" mode that picks polling vs. callback based on device capability would have to be a third explicit choice — silently switching would be confusing.
