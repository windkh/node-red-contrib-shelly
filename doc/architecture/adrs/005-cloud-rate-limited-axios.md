# 005 — Cloud node uses a shared rate-limited axios instance

- **Status:** Accepted
- **Date:** ~2022

## Context

Shelly Cloud caps API requests at **1 request per second per account**. Exceeding the cap returns HTTP 401 (not 429 as one might expect) — a misleading status that suggests an auth problem.

If multiple `shelly-cloud` device nodes in a single Node-RED flow each made their own unlimited axios calls, even modest usage would burst over the cap and start failing with confusing auth errors.

## Decision

Use a **single rate-limited axios instance** shared by all cloud nodes in the same Node-RED process. The instance is module-level in [`shelly/nodes/cloud-node.js`](../../../shelly/nodes/cloud-node.js):

```js
const cloudAxios = rateLimit(axios.create(), {
    maxRequests: 1, perMilliseconds: 1000, maxRPS: 1
});
```

The [`axios-rate-limit`](https://github.com/aishek/axios-rate-limit) library queues excess requests rather than failing them.

## Consequences

**Positive:**

- Users with N cloud nodes don't have to think about coordination — the limit is enforced for them.
- The misleading 401 from the cloud is eliminated; failing requests are now genuine auth failures, not rate-limit overruns.
- Backpressure naturally throttles fast-firing input messages: a tight loop of cloud commands fans out at 1/s instead of bursting and failing.

**Negative:**

- One slow / hung cloud request stalls every other cloud node in the same process for its duration. The library has no per-request timeout configured.
- The shared instance means we can't isolate auth keys at the axios level — but since auth is sent per request (in the body, not headers), this isn't actually a problem.
- A flow with multiple Shelly accounts can't bypass the limit by using separate auth keys; the limit is enforced globally. This matches the cloud's actual behaviour, so it's correct, but it surprises users.

**Locks us into:**

- The cloud transport must remain logically synchronous from the caller's point of view. A future async-streaming cloud API would not fit this shape.
