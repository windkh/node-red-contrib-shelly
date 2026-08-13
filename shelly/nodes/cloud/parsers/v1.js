'use strict';

// Request building for the v1 Cloud Control API.
//
// v1 is deprecated by Shelly ("will be removed in the near future") but stays because
// existing flows speak its vocabulary and it is not translatable to v2 without changing
// every payload — see doc/migration/cloud-api-v1-to-v2.md and ADR-011.
//
// v1 posts everything form-urlencoded, auth_key included, so a request is a route plus a
// query-string fragment.

// Drops undefined entries and encodes the rest as a query string.
function encodeParams(data) {
    Object.keys(data).forEach((key) => data[key] === undefined && delete data[key]);
    const params = new URLSearchParams(data).toString();
    return params;
}

function encodeArrayParams(data) {
    const params = JSON.stringify(data);
    return params;
}

// Returns { route, params } for a v1 payload, or undefined when the type is not a v1
// command. The caller reports the unknown type — this function does not throw, because an
// unrecognised type is a user mistake in a flow, not an exceptional condition.
function buildRequestV1(payload) {
    let result;

    const type = payload.type;
    if (type === 'light') {
        result = {
            route: '/device/light/control',
            params: encodeParams({
                id: payload.id,
                channel: payload.channel,
                turn: payload.turn,
                brightness: payload.brightness,
                white: payload.white,
                red: payload.red,
                green: payload.green,
                blue: payload.blue,
                gain: payload.gain,
            }),
        };
    } else if (type === 'relay') {
        result = {
            route: '/device/relay/control',
            params: encodeParams({
                id: payload.id,
                channel: payload.channel,
                turn: payload.turn,
            }),
        };
    } else if (type === 'roller') {
        result = {
            route: '/device/relay/roller/control',
            params: encodeParams({
                id: payload.id,
                channel: payload.channel,
                direction: payload.direction,
                pos: payload.pos,
            }),
        };
    } else if (type === 'relays') {
        // Bulk control takes the device list as a JSON array rather than a repeated field.
        const params = encodeParams({ turn: payload.turn });
        result = {
            route: '/device/relay/bulk_control',
            params: params + '&devices=' + encodeArrayParams(payload.devices),
        };
    } else if (type === 'status') {
        result = {
            route: '/device/status',
            params: encodeParams({ id: payload.id }),
        };
    } else if (type === 'all_status') {
        result = {
            route: '/device/all_status',
            params: encodeParams({
                show_info: payload.show_info,
                no_shared: payload.no_shared,
            }),
        };
    }

    return result;
}

module.exports = { buildRequestV1 };
