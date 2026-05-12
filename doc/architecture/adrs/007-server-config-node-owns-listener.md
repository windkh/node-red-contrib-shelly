# 007 — The fastify callback listener lives on the server config node

- **Status:** Accepted
- **Date:** ~2022

## Context

In callback mode, the package opens an HTTP server inside the Node-RED process to receive device pushes (uploaded-script POSTs, webhook GETs). That server needs:

- A user-configurable port (so it doesn't collide with other services).
- A user-configurable hostname/IP override (for Docker / bridged-net setups where Node-RED's externally-reachable address differs from its bind address).
- Exactly one instance per port across a Node-RED process — you can't have two listeners on the same port.

Multiple device nodes share the listener — every gen 2 device in callback mode in the same flow needs to point at the same `http://node-red-host:port/callback`.

## Decision

Move the listener to a **server config node**. Each device node references a config node via the standard Node-RED `config` field, and the config node owns the [fastify](https://www.fastify.io/) instance.

There are three server config types:

- `shelly-gen1-server` ([`gen1-server-node.js`](../../../shelly/nodes/gen1-server-node.js)) — listens on `GET /webhook`.
- `shelly-gen2-server` ([`gen2-server-node.js`](../../../shelly/nodes/gen2-server-node.js)) — listens on `PUT /callback` and `GET /webhook`.
- `shelly-cloud-server` ([`cloud-server-node.js`](../../../shelly/nodes/cloud-server-node.js)) — no listener; just holds the cloud auth key + URI.

The listener emits a `callback` event on the config-node EventEmitter. Device nodes register listeners on that event and filter by `data.sender === node.hostname`.

## Consequences

**Positive:**

- Standard Node-RED idiom — config nodes are exactly what the docs say to use for shared resources.
- One port per protocol, regardless of how many device nodes share it.
- The config node's `close` handler can stop fastify cleanly when the user un-deploys all devices using it.

**Negative:**

- Users new to Node-RED don't realise they need to wire up the config node — selecting "callback" mode on a device without binding the server config is the #1 misconfiguration. The 11.10.0 release made this visible (`node.warn` + yellow status badge) instead of silent.
- The "sender filter" (`data.sender === node.hostname`) is a string-equality check on hostname. A device whose hostname is recorded as `shelly1-AABBCC.local` in one place and `192.168.1.5` in another won't match itself. The templated callback script writes the configured hostname into the payload, so as long as the user doesn't change it post-install, this works — but it's a brittle coupling.
- One bad device flooding the listener with events affects every other device sharing it.

**Locks us into:**

- The fastify dependency. If we ever wanted to host on Node-RED's own HTTP server (Express), this would need rework — fastify and Express don't share a route layer.
