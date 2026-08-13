# Migrating the cloud node from API v1 to v2

Shelly marks the [v1 Cloud Control API](https://shelly-api-docs.shelly.cloud/cloud-control-api/communication)
as **deprecated and to be removed in the near future**. Its replacement is
[Communication v2.0-beta](https://shelly-api-docs.shelly.cloud/cloud-control-api/communication-v2).

This package supports both. The version is chosen on the **cloud server config node**, so it
applies to every cloud node bound to that configuration.

## Do I have to do anything right now?

No. A configuration created before the version option existed keeps using **v1**, and updating
the package does not change that. Nothing in an existing flow changes until you decide to move.

New cloud server configurations are created as **v2**.

> **Switching version is a migration, not a toggle.** The two versions use different payloads.
> Flipping the setting without rewriting the messages will break every command in the flow —
> which is exactly why v1 is still here.

## Why bother

- **Batch reads.** v2 reads up to 10 devices in one call. The cloud allows roughly one request
  per second in both versions, so reading ten devices drops from ten seconds to one.
- **Errors that say something.** v2 answers a failure with a documented reason —
  `DEVICE_OFFLINE`, `DEVICE_INVALID_MODE`, `BAD_REQUEST` and friends — and the node now puts that
  reason in `msg.error` and the node status. v1 gave you a bare status code.
- **More control.** Covers gain slat control, relative moves and durations; lights gain
  `mode`, `temperature` and `effect`; switches gain `toggle_after`.

## Command mapping

| v1                   | v2               | Notes                                                     |
| -------------------- | ---------------- | --------------------------------------------------------- |
| `type: "relay"`      | `type: "switch"` | `turn: "on"/"off"` becomes `on: true/false`               |
| `type: "roller"`     | `type: "cover"`  | `direction` and `pos` both become `position`              |
| `type: "light"`      | `type: "light"`  | `turn` becomes `on`; adds `mode`, `temperature`, `effect` |
| `type: "relays"`     | `type: "groups"` | different structure; ids become `"<ID>_<CHANNEL>"`        |
| `type: "status"`     | `type: "get"`    | takes a list; **the response shape also changes**         |
| `type: "all_status"` | —                | no v2 equivalent                                          |

### Relay becomes switch

```js
// v1
msg.payload = { type: 'relay', id: 'b48a0a1cd978', channel: 0, turn: 'on' };

// v2
msg.payload = { type: 'switch', id: 'b48a0a1cd978', channel: 0, on: true };
```

`on` is a boolean, not the string `"on"`. v2 also accepts `toggle_after` (seconds), which returns
the output to the opposite state on its own.

### Roller becomes cover

```js
// v1 — two different fields
msg.payload = { type: 'roller', id: 'a1b2c3d4e5f6', channel: 0, direction: 'open' };
msg.payload = { type: 'roller', id: 'a1b2c3d4e5f6', channel: 0, pos: 80 };

// v2 — one field that takes either
msg.payload = { type: 'cover', id: 'a1b2c3d4e5f6', channel: 0, position: 'open' };
msg.payload = { type: 'cover', id: 'a1b2c3d4e5f6', channel: 0, position: 80 };
```

`position` accepts `open`, `close`, `stop` or 0–100. New optional fields: `duration` (only with
`open`/`close`/`stop`), `relative` (−100…100), `slatPosition` and `slatRelative`. `position` and
`relative` must not be combined, nor `slatPosition` and `slatRelative`.

### Light keeps its name but not its fields

```js
// v1
msg.payload = { type: 'light', id: '8caab55397c7', channel: 0, turn: 'on', brightness: 70 };

// v2
msg.payload = {
    type: 'light',
    id: '8caab55397c7',
    channel: 0,
    on: true,
    mode: 'white',
    temperature: 3000,
    brightness: 70,
};
```

`brightness`, `red`, `green`, `blue`, `white` and `gain` keep their names and ranges. Only `turn`
changes, to `on`. New: `mode` (`color` / `white`), `temperature` (2700–7000), `effect` (0–6),
`toggle_after`.

### Bulk control becomes groups

```js
// v1 — switches only
msg.payload = { type: 'relays', turn: 'on', devices: [{ id: 'b48a0a1cd978', channel: '0' }] };

// v2 — switches, covers and lights in one request
msg.payload = {
    type: 'groups',
    switch: { ids: ['b48a0a1cd978_0'], command: { on: true } },
    cover: { ids: ['a1b2c3d4e5f6_0'], command: { position: 'close' } },
};
```

Ids are `"<DEVICE_ID>_<CHANNEL>"`; the channel defaults to 0 if left off. A group call answers with
a `failedCommands` map keyed by id when only some devices fail, so a partial failure is visible
instead of silent.

### Status becomes get — and the answer changes shape

This is the part that breaks flows downstream of the node rather than at it.

```js
// v1 — one device per call
msg.payload = { type: 'status', id: 'b48a0a1cd978' };

// v2 — up to 10, and you choose what comes back
msg.payload = { type: 'get', ids: ['b48a0a1cd978', 'a1b2c3d4e5f6'], select: ['status'] };
```

For convenience a single `id` is accepted and turned into a one-element `ids` list.

**v1** returned the device status object directly. **v2** returns a list of entries shaped like:

```json
{ "id": "...", "type": "...", "code": "...", "gen": "...", "online": 1, "status": {}, "settings": {} }
```

`status` and `settings` appear only if you asked for them via `select`. Anything reading
`msg.payload` after the cloud node — a change node, a function, a chart — has to be adjusted.
`pick` can trim the response, for example `pick: { status: ['switch:0'] }`.

### Control commands answer with nothing

v1 replied to a control command with a body such as `{ isok: true, data: { ... } }`. v2 signals
success with **HTTP 200 and an empty body**, so `msg.payload` is an empty string after a `switch`,
`cover` or `light` command. That is not a fault: a command that fails raises an error instead, so an
empty payload means it was accepted.

A `groups` call is the exception — it answers with a `failedCommands` map when some of the devices
could not be driven, and that body is passed through.

If a flow branches on `msg.payload.isok`, replace that with the node's error output.

### all_status has no successor

v1's `all_status` returned every device on the account. v2 requires an explicit list of at most ten
ids, and there is no "list everything" call. If you rely on `all_status`, stay on v1 for that flow
until Shelly provides an equivalent.

## How to switch

1. Open the **cloud server** configuration node.
2. Set **API Version** to `v2`.
3. Rewrite the payloads in that flow using the table above.
4. Adjust anything downstream that reads the response of a `get`.
5. Deploy.

If a command is not recognised for the configured version, the node now reports it —
`unknown command "relay" for cloud API v2` — instead of quietly doing nothing. That message is
the usual sign of a half-finished migration.

## Examples

- [`examples/cloud-v1.json`](../../examples/cloud-v1.json) — the v1 vocabulary
- [`examples/cloud-v2.json`](../../examples/cloud-v2.json) — the v2 vocabulary

Both ship in the package, so they can be imported from the Node-RED editor via
**Import → Examples → node-red-contrib-shelly**.

## See also

- [ADR-011](../architecture/adr/011-cloud-api-v1-v2-coexistence.md) — why both versions exist
- [Issue #283](https://github.com/windkh/node-red-contrib-shelly/issues/283)
