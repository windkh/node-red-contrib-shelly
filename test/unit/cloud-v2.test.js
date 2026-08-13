const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { buildRequestV2 } = require('../../shelly/nodes/cloud/parsers/v2.js');
const { resolveApiVersion } = require('../../shelly/nodes/cloud/api-version.js');
const { describeCloudErrorV2 } = require('../../shelly/nodes/cloud/errors.js');

// Field names and routes follow the v2.0-beta specification:
// https://shelly-api-docs.shelly.cloud/cloud-control-api/communication-v2

describe('cloud v2 — switch', () => {
    it('builds the switch request', () => {
        const request = buildRequestV2({ type: 'switch', id: 'b48a0a1cd978', channel: 0, on: true });

        assert.equal(request.route, '/v2/devices/api/set/switch');
        assert.deepEqual(request.body, { id: 'b48a0a1cd978', channel: 0, on: true });
    });

    it('keeps on:false — the value that a truthiness check would drop', () => {
        // Turning something off is not the same as not saying anything about it.
        const request = buildRequestV2({ type: 'switch', id: 'b48a0a1cd978', on: false });

        assert.deepEqual(request.body, { id: 'b48a0a1cd978', on: false });
    });

    it('keeps channel:0 rather than treating it as absent', () => {
        const request = buildRequestV2({ type: 'switch', id: 'b48a0a1cd978', channel: 0, on: true });

        assert.equal(request.body.channel, 0);
    });

    it('carries toggle_after', () => {
        const request = buildRequestV2({ type: 'switch', id: 'b48a0a1cd978', on: true, toggle_after: 30 });

        assert.equal(request.body.toggle_after, 30);
    });

    it('omits everything the caller did not set', () => {
        const request = buildRequestV2({ type: 'switch', id: 'b48a0a1cd978', on: true });

        assert.deepEqual(Object.keys(request.body), ['id', 'on']);
    });
});

describe('cloud v2 — cover', () => {
    it('accepts a named position', () => {
        const request = buildRequestV2({ type: 'cover', id: 'b48a0a1cd978', position: 'open' });

        assert.equal(request.route, '/v2/devices/api/set/cover');
        assert.deepEqual(request.body, { id: 'b48a0a1cd978', position: 'open' });
    });

    it('accepts a numeric position, including 0', () => {
        const request = buildRequestV2({ type: 'cover', id: 'b48a0a1cd978', position: 0 });

        assert.equal(request.body.position, 0);
    });

    it('carries duration alongside a named position', () => {
        const request = buildRequestV2({ type: 'cover', id: 'b48a0a1cd978', position: 'stop', duration: 5 });

        assert.deepEqual(request.body, { id: 'b48a0a1cd978', position: 'stop', duration: 5 });
    });

    it('carries relative and slat parameters', () => {
        const request = buildRequestV2({
            type: 'cover',
            id: 'b48a0a1cd978',
            relative: -20,
            slatPosition: 40,
        });

        assert.deepEqual(request.body, { id: 'b48a0a1cd978', relative: -20, slatPosition: 40 });
    });
});

describe('cloud v2 — light', () => {
    it('builds a white-mode request', () => {
        const request = buildRequestV2({
            type: 'light',
            id: 'b48a0a1cd978',
            on: true,
            mode: 'white',
            temperature: 3000,
            brightness: 70,
        });

        assert.equal(request.route, '/v2/devices/api/set/light');
        assert.deepEqual(request.body, {
            id: 'b48a0a1cd978',
            on: true,
            mode: 'white',
            temperature: 3000,
            brightness: 70,
        });
    });

    it('builds a colour-mode request including effect', () => {
        const request = buildRequestV2({
            type: 'light',
            id: 'b48a0a1cd978',
            on: true,
            mode: 'color',
            red: 255,
            green: 128,
            blue: 0,
            white: 0,
            gain: 100,
            effect: 3,
        });

        assert.equal(request.body.red, 255);
        assert.equal(request.body.white, 0);
        assert.equal(request.body.effect, 3);
    });
});

describe('cloud v2 — groups', () => {
    it('passes the group structure through', () => {
        const payload = {
            type: 'groups',
            switch: { ids: ['a_0', 'b_1'], command: { on: true } },
            cover: { ids: ['c_0'], command: { position: 'close' } },
        };
        const request = buildRequestV2(payload);

        assert.equal(request.route, '/v2/devices/api/set/groups');
        assert.deepEqual(request.body, {
            switch: { ids: ['a_0', 'b_1'], command: { on: true } },
            cover: { ids: ['c_0'], command: { position: 'close' } },
        });
        assert.equal(request.body.light, undefined, 'a group that was not given must not be sent');
    });
});

describe('cloud v2 — get', () => {
    it('reads several devices in one call', () => {
        const request = buildRequestV2({ type: 'get', ids: ['a', 'b', 'c'], select: ['status'] });

        assert.equal(request.route, '/v2/devices/api/get');
        assert.deepEqual(request.body, { ids: ['a', 'b', 'c'], select: ['status'] });
    });

    it('accepts a single id and normalises it to a list', () => {
        // The spec only takes `ids`, but reading one device is the common case and writing a
        // one-element array for it is a papercut.
        const request = buildRequestV2({ type: 'get', id: 'b48a0a1cd978' });

        assert.deepEqual(request.body, { ids: ['b48a0a1cd978'] });
    });

    it('prefers ids when both are given', () => {
        const request = buildRequestV2({ type: 'get', id: 'ignored', ids: ['a', 'b'] });

        assert.deepEqual(request.body.ids, ['a', 'b']);
    });

    it('carries select and pick', () => {
        const request = buildRequestV2({
            type: 'get',
            ids: ['a'],
            select: ['status', 'settings'],
            pick: { status: ['switch:0'] },
        });

        assert.deepEqual(request.body.select, ['status', 'settings']);
        assert.deepEqual(request.body.pick, { status: ['switch:0'] });
    });
});

describe('cloud v2 — unknown commands', () => {
    it('returns undefined for a v1 command sent to a v2 connection', () => {
        assert.equal(buildRequestV2({ type: 'relay', id: 'a', turn: 'on' }), undefined);
        assert.equal(buildRequestV2({ type: 'roller', id: 'a', direction: 'open' }), undefined);
        assert.equal(buildRequestV2({ type: 'relays', turn: 'on', devices: [] }), undefined);
        assert.equal(buildRequestV2({ type: 'status', id: 'a' }), undefined);
        assert.equal(buildRequestV2({ type: 'all_status' }), undefined);
    });
});

describe('resolveApiVersion', () => {
    it('selects v2 only on an explicit v2', () => {
        assert.equal(resolveApiVersion('v2'), 'v2');
    });

    it('falls back to v1 when the property is absent', () => {
        // The whole point: a config node saved before this option existed must not be
        // switched to an incompatible API by upgrading the package.
        assert.equal(resolveApiVersion(undefined), 'v1');
        assert.equal(resolveApiVersion(null), 'v1');
        assert.equal(resolveApiVersion(''), 'v1');
    });

    it('falls back to v1 on an unrecognised value', () => {
        assert.equal(resolveApiVersion('v3'), 'v1');
        assert.equal(resolveApiVersion('V2'), 'v1');
    });

    it('keeps v1 when explicitly chosen', () => {
        assert.equal(resolveApiVersion('v1'), 'v1');
    });
});

describe('describeCloudErrorV2', () => {
    it('surfaces the documented error string', () => {
        const error = new Error('Request failed with status code 400');
        error.response = { data: { error: 'DEVICE_OFFLINE' } };

        assert.equal(describeCloudErrorV2(error), 'DEVICE_OFFLINE');
    });

    it('appends the detail messages', () => {
        const error = new Error('Request failed with status code 400');
        error.response = { data: { error: 'BAD_REQUEST', data: { messages: ['on is required'] } } };

        assert.equal(describeCloudErrorV2(error), 'BAD_REQUEST: on is required');
    });

    it('joins multiple messages', () => {
        const error = new Error('boom');
        error.response = { data: { error: 'BAD_REQUEST', data: { messages: ['a', 'b'] } } };

        assert.equal(describeCloudErrorV2(error), 'BAD_REQUEST: a; b');
    });

    it('falls back to the transport message when there is no cloud body', () => {
        // A DNS failure or timeout never reaches the cloud, so there is nothing to unwrap.
        assert.equal(
            describeCloudErrorV2(new Error('getaddrinfo ENOTFOUND shelly.cloud')),
            'getaddrinfo ENOTFOUND shelly.cloud'
        );
    });

    it('falls back when the response body is not a cloud error', () => {
        const error = new Error('Request failed with status code 502');
        error.response = { data: '<html>gateway timeout</html>' };

        assert.equal(describeCloudErrorV2(error), 'Request failed with status code 502');
    });
});
