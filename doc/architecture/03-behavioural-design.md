# 03 · Behavioural Design

## Node lifecycle

A device node goes through five distinct phases at runtime. The phases apply with minor variations to all three node families (gen1, gen2, cloud).

```
   1                2                  3                 4              5
   ┌────────┐       ┌──────────────┐   ┌────────────┐    ┌─────────┐    ┌──────┐
──►│Created ├──────►│Type-checked  ├──►│Initialised ├───►│Operating├───►│Closed│
   │        │       │against /shelly│   │(polling or │    │  loop   │    │      │
   └────────┘       │/Shelly.GetInfo│   │ callback)  │    └─────────┘    └──────┘
                    └──────────────┘   └────────────┘
```

### Phase 1 — Creation

When Node-RED deploys a flow, it instantiates each device node by calling its constructor (`ShellyGen1Node`, `ShellyGen2Node`, `ShellyCloudNode`).

The constructor:

- Reads the editor configuration via `config.<field>` and stores it on `this`/`node` (hostname, deviceType, pollInterval, mode, server reference, etc.).
- Resolves the bound **server config node** with `RED.nodes.getNode(config.server)`.
- Creates a per-node `axios` instance scoped to `http://<hostname>/` with a 5-second default timeout.
- Looks up the device catalog: `configuration.getDeviceType(model)` for an exact model, or `configuration.getDeviceTypesN(family, exact)` for a prefix list.
- Wires the **initializer function** (`getInitializer1/2`) and **input parser function** (`getInputParser1/2`) based on device type. These are function-table lookups: device type → handler.
- Registers `input` and `close` handlers.

This phase is synchronous and cannot fail in any observable way — invalid config produces a red status badge but doesn't throw.

### Phase 2 — Reachability and type-check

Triggered by phase 3 (init), this is where the package validates that the configured device type matches what's actually at the hostname.

`shelly.tryCheckDeviceType` (or `shellyPing` during polling) hits a no-auth probe endpoint:

- **Gen 1:** `GET /shelly` returns `{type: "SHSW-1", ...}`. The package reads `body.type` and asserts it starts with one of the configured model prefixes.
- **Gen 2+:** `GET /shelly` returns `{model: "SNSW-001X16EU", gen: 2, ...}`. The package reads `body.gen` to verify the right node type (gen2-compatible) and `body.model` for the catalog match.

On mismatch: red status badge with the actual device type and an exhortation to either change the configured type or open an issue.

### Phase 3 — Initialisation

Determined by `node.mode` (set by the editor; defaults to `polling`):

**Polling mode:**

```
tryCheckDeviceType → shelly.start
                       ↓
                     credentials = getCredentials(node)
                     node.online = await shellyPing(...)
                     setInterval(<pollInterval>, async () => {
                         if (node.closing) return;
                         found = await shellyPing(...);
                         if (node.closing) return;
                         // emit transitions, optionally re-emit input
                         node.online = found;
                     });
```

**Callback mode (gen 2+):**

```
tryCheckDeviceType
   ↓
tryUninstallScriptAsync('node-red-contrib-shelly')   // best-effort cleanup
   ↓
fs.readFileSync('../scripts/callback.js')
   ↓
script = template.replace('%URL%',    'http://<node-red-ip>:<port>/callback')
              .replace('%SENDER%',    '<device-hostname>')
   ↓
tryInstallScriptAsync(node, script, 'node-red-contrib-shelly')
   ↓
  POST /rpc/Script.Stop|Delete    (remove any old copy)
  POST /rpc/Script.Create         (returns scriptId)
  POST /rpc/Script.PutCode        (chunked, 1024 bytes per request)
  POST /rpc/Script.SetConfig {enable: true}
  POST /rpc/Script.Start
  POST /rpc/Script.GetStatus      (assert running)
```

**Callback mode (gen 1 / gen 2 sensors):** sensors and gen 1 devices don't support scripts. They support _webhooks_ instead. The code calls the device's built-in `GET /settings/actions` route (gen 1) or `POST /rpc/Webhook.*` (gen 2) to install URLs pointing at the fastify listener.

**Callback mode + BLU:** for a gen 2+ device acting as a BLU gateway, the BLU scanner script is uploaded _in addition to_ the callback script. The scanner watches BTHomeV2 advertisements; the callback script forwards them as events tagged `info.event === "shelly-blu"`.

**Retry-on-failure:** if init returns `false` (device unreachable, asleep, etc.), the constructor's IIFE emits an `error` message and schedules a retry interval — `setInterval(retry, node.initializeRetryInterval)` (defaults: 5005ms gen1, 5006ms gen2). Each retry re-runs the full initializer. On success it clears the interval.

### Phase 4 — Operating loop

This is the phase the node spends most of its life in. Two event sources drive it:

**(A) `input` messages from upstream Node-RED nodes:**

```
node.on('input', async msg => {
    credentials = shelly.getCredentials(node, msg);    // msg.payload can override
    // gen 1:
    settings = msg.settings; if (settings) applySettings1Async(...);
    route = await node.inputParser(msg, node, credentials);  // produces URL fragment
    executeCommand1(msg, route, node, credentials);          // sends HTTP, emits result

    // gen 2:
    requests = await node.inputParser(msg, node, credentials);  // array of JSON-RPC payloads
    requests.forEach(req => executeCommand2(msg, req, node, credentials));
});
```

The **input parser** is the device-family-specific translation step. For gen 1, eight specialised parsers each emit a query-string route (`'/relay/0?turn=on&timer=5'`). For gen 2+, a single generic parser wraps `{method, parameters}` into the JSON-RPC envelope `{id: 1, method, params}`.

**`executeCommandN`** then issues the HTTP request via `shelly.shellyRequestAsync` (auth + transparent digest retry), optionally fetches the full status via `/status` or `/rpc/Shelly.GetStatus` (if `node.getStatusOnCommand` is set), and emits one message per request. On error it sets `msg.error = {hostname, error: error.message}` and emits anyway, so downstream nodes can react.

**(B) Server config node `callback` events** (callback mode only):

The server config node's fastify routes (`POST /callback` and `GET /webhook`) emit a `callback` event with `{sender, event}`. The device node listens on that event:

```
node.onCallback = function(data) {
    if (data.sender === node.hostname) {       // only handle our device's events
        if (node.outputMode === 'event')   node.send([{ payload: data.event }]);
        else if (node.outputMode === 'status') node.emit('input', {});  // pull fresh status
    }
};
node.server.addListener('callback', node.onCallback);
```

So callback mode can either **forward raw events** (event mode) or **trigger a status refresh** (status mode). The choice is per-device in the editor.

### Phase 5 — Close

Triggered by Node-RED on flow redeploy or shutdown:

```
node.on('close', function(done) {
    node.closing = true;                    // gate for in-flight awaits (since 11.10.0)
    node.status({});
    if (node.onCallback) node.server.removeListener('callback', node.onCallback);
    clearInterval(node.pollingTimer);
    clearInterval(node.initializeTimer);
    done();
});
```

The `node.closing` flag is checked at three points: the init IIFE after its `await`, the retry interval callback, and the polling-loop's setInterval body. These short-circuit when the flag is set, preventing the well-documented race in older versions where a slow init could schedule a fresh `setInterval` _after_ close had already cleared it (see [Errors and Weaknesses §3](05-errors-and-weaknesses.md) and [ADR-008](adrs/008-digest-auth-401-retry.md)).

**Not done in close (by design):** the uploaded callback script is _not_ removed from the device. Webhooks are not removed either. A comment in the code reads `// TODO: call node.uninitializer();` — this is a known gap.

## Message contract

The package follows the standard Node-RED in/out shape.

### Inbound (`msg.payload` into a device node)

**Gen 1 — varies by device family.** Examples:

```js
// Relay
{ relay: 0, turn: 'on',  timer: 5 }     // or { on: true }
// Dimmer
{ light: 0, on: true, brightness: 60, transition: 500 }
// Roller
{ roller: 0, go: 'to_pos', roller_pos: 50 }
// Settings (universal)
msg.settings = [{ device: 'ext_temperature', index: 0, attribute: 'overtemp_act', value: 'relay_on' }]
```

**Gen 2+ — uniform JSON-RPC shape** (or an array for batched calls):

```js
{ method: 'Switch.Set',  parameters: { id: 0, on: true, toggle_after: 5 } }
{ method: 'Light.Set',   parameters: { id: 0, on: true, brightness: 60, transition_duration: 1 } }
{ method: 'RGBW.Set',    parameters: { id: 0, on: true, brightness: 80 } }
```

**Cloud — type-discriminated:**

```js
{ type: 'relay', id: '<hex device id>', channel: 0, turn: 'on' }
{ type: 'status', id: '<hex device id>' }
{ type: 'status_all' }
```

**Credential overrides** in any node: `msg.payload.hostname`, `msg.payload.username`, `msg.payload.password` — useful for sub-flows that target many devices.

### Outbound

| Field | Meaning |
|---|---|
| `msg.payload` | Lightweight status (gen 1: `convertStatus1` filtered; gen 2: `convertStatus2` filtered; cloud: raw response) or, in callback `event` mode, the event itself |
| `msg.status` | Full unfiltered status object from `/status` (gen 1) or `Shelly.GetStatus` (gen 2). Only present when `getStatusOnCommand` is on |
| `msg.error` | `{hostname, error: error.message}` on any device-side failure (network, auth, 4xx, 5xx) |

## State machines

The node has two implicit state machines:

### Reachability state (polling mode)

```
        first poll                  poll succeeds
       ┌─────────────┐               ┌──────────────────┐
       │             ▼               │                  ▼
   ┌───────┐     ┌──────────┐      ┌─────────┐     ┌──────────┐
   │ Init  │────►│ unknown  │      │ offline │     │  online  │
   └───────┘     └──────────┘      └─────────┘◄────┤          │
                       │                  ▲        └──────────┘
                       │  poll fails       │  poll fails
                       └──────────────────►│
```

Tracked as `node.online` (boolean). Transitions to/from `offline` emit:

- A yellow status badge: "Polling: device not reachable"
- A `msg.error` notification on the node's output (the misbehaviour fixed in 11.9.1 was that the _first_ transition was lost; the loop now correctly catches the very first online/offline change too).

### Init state

```
   ┌─────────┐  initializer succeeds   ┌────────────┐
   │ pending ├────────────────────────►│ initialised│
   └─────┬───┘                         └────────────┘
         │
         │  initializer returns false
         ▼
   ┌────────┐     retry succeeds       ┌────────────┐
   │ retry  ├─────────────────────────►│ initialised│
   │ loop   │                          └────────────┘
   └────────┘
       ▲
       │
       │  every <initializeRetryInterval> ms
       │  while retry returns false
       └───
```

The retry loop is cleared by `close`, and as of 11.10.0 won't be re-armed by a late-arriving initializer resolve.

## Concurrency and timing

- **One axios instance per node**, created at construction. Each device gets isolated connection state.
- **Two timers per node:** `pollingTimer` (alive only in polling mode) and `initializeTimer` (alive only while waiting for first init success). Both are cleared in `close`.
- **No mutexes / locking.** The library assumes that input messages arrive sequentially, which is the Node-RED single-threaded reality.
- **Module-global state:**
  - `nonceCount` in [`lib/shelly.js`](../../shelly/lib/shelly.js) — monotonic counter for HTTP Digest auth. Shared across all nodes (see [Errors and Weaknesses §nonceCount](05-errors-and-weaknesses.md)).
  - `cloudAxios` in [`nodes/cloud-node.js`](../../shelly/nodes/cloud-node.js) — single rate-limited axios instance shared by _all_ cloud nodes (so the 1 req/sec limit is enforced across the whole flow, not per node).

## Error propagation

Errors are surfaced in three places, in this order:

1. **`node.status({fill: 'red'|'yellow', shape: 'ring', text})`** — visual badge in the editor.
2. **`node.warn()` / `node.error()`** — sidebar debug pane.
3. **`msg.error`** — programmatic, on the node's output, so downstream flows can branch.

A failure typically populates all three. Since 11.10.1, when the device returns a non-2xx status, the body of its JSON-RPC error is also folded into the thrown error's `.message`, so the user sees the underlying reason rather than just "Request failed with status code 400".
