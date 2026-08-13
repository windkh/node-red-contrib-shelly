'use strict';

// Request building for the v2.0-beta Cloud Control API.
// https://shelly-api-docs.shelly.cloud/cloud-control-api/communication-v2
//
// Unlike v1 this is a JSON body; auth_key travels in the query string and is added by the
// transport, not here. Field names and value shapes follow the specification exactly — the
// vocabulary differs from v1 throughout (turn:"on" became on:true, direction/pos collapsed
// into position), which is why the two versions cannot share a parser.
//
// Values are passed through rather than range-checked. The API validates them and, since
// this version reports BAD_REQUEST with a readable message, a rejected value now reaches
// the user as a real error instead of silently disappearing.

const ROUTES = {
    switch: '/v2/devices/api/set/switch',
    cover: '/v2/devices/api/set/cover',
    light: '/v2/devices/api/set/light',
    groups: '/v2/devices/api/set/groups',
    get: '/v2/devices/api/get',
};

// Builds an object with the undefined entries removed, so the JSON body carries only what
// the user actually set. Sending an explicit null would be rejected as a bad value.
function compact(data) {
    const result = {};

    Object.keys(data).forEach((key) => {
        if (data[key] !== undefined) {
            result[key] = data[key];
        }
    });

    return result;
}

// The get endpoint takes a list of 1-10 ids. A single id is by far the common case, so
// accept `id` as well and normalise — otherwise every simple read needs a one-element array.
function normalizeIds(payload) {
    let result;

    if (payload.ids !== undefined) {
        result = Array.isArray(payload.ids) ? payload.ids : [payload.ids];
    } else if (payload.id !== undefined) {
        result = [payload.id];
    }

    return result;
}

// Returns { route, body } for a v2 payload, or undefined when the type is not a v2 command.
function buildRequestV2(payload) {
    let result;

    const type = payload.type;
    if (type === 'switch') {
        result = {
            route: ROUTES.switch,
            body: compact({
                id: payload.id,
                channel: payload.channel,
                on: payload.on,
                toggle_after: payload.toggle_after,
            }),
        };
    } else if (type === 'cover') {
        result = {
            route: ROUTES.cover,
            body: compact({
                id: payload.id,
                channel: payload.channel,
                position: payload.position,
                duration: payload.duration,
                relative: payload.relative,
                slatPosition: payload.slatPosition,
                slatRelative: payload.slatRelative,
            }),
        };
    } else if (type === 'light') {
        result = {
            route: ROUTES.light,
            body: compact({
                id: payload.id,
                channel: payload.channel,
                on: payload.on,
                toggle_after: payload.toggle_after,
                mode: payload.mode,
                temperature: payload.temperature,
                brightness: payload.brightness,
                red: payload.red,
                green: payload.green,
                blue: payload.blue,
                white: payload.white,
                gain: payload.gain,
                effect: payload.effect,
            }),
        };
    } else if (type === 'groups') {
        // Each group is { ids, command }; ids are "<ID>_<CHANNEL>". Passed through as given
        // so a caller can drive switch, cover and light in one request.
        result = {
            route: ROUTES.groups,
            body: compact({
                switch: payload.switch,
                cover: payload.cover,
                light: payload.light,
            }),
        };
    } else if (type === 'get') {
        result = {
            route: ROUTES.get,
            body: compact({
                ids: normalizeIds(payload),
                select: payload.select,
                pick: payload.pick,
            }),
        };
    }

    return result;
}

module.exports = { buildRequestV2, ROUTES };
