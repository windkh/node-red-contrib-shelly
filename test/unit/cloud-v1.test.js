const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { buildRequestV1 } = require('../../shelly/nodes/cloud/parsers/v1.js');

// These pin the v1 wire format exactly as it was before the request building was extracted
// out of cloud-node.js, so the refactor cannot have changed what reaches the cloud. v1 is
// deprecated by Shelly but stays supported, and existing flows depend on this byte for byte.

describe('cloud v1 — relay', () => {
    it('builds the relay control request', () => {
        const request = buildRequestV1({ type: 'relay', id: 'abc123', channel: 0, turn: 'on' });

        assert.equal(request.route, '/device/relay/control');
        assert.equal(request.params, 'id=abc123&channel=0&turn=on');
    });

    it('omits fields that are not set rather than sending empties', () => {
        const request = buildRequestV1({ type: 'relay', id: 'abc123', turn: 'off' });

        assert.equal(request.params, 'id=abc123&turn=off');
    });
});

describe('cloud v1 — roller', () => {
    it('builds a direction request', () => {
        const request = buildRequestV1({ type: 'roller', id: 'abc123', channel: 0, direction: 'open' });

        assert.equal(request.route, '/device/relay/roller/control');
        assert.equal(request.params, 'id=abc123&channel=0&direction=open');
    });

    it('builds a position request', () => {
        const request = buildRequestV1({ type: 'roller', id: 'abc123', channel: 0, pos: 50 });

        assert.equal(request.params, 'id=abc123&channel=0&pos=50');
    });
});

describe('cloud v1 — light', () => {
    it('carries the full colour parameter set', () => {
        const request = buildRequestV1({
            type: 'light',
            id: 'abc123',
            channel: 0,
            turn: 'on',
            brightness: 80,
            white: 255,
            red: 10,
            green: 20,
            blue: 30,
            gain: 90,
        });

        assert.equal(request.route, '/device/light/control');
        assert.equal(
            request.params,
            'id=abc123&channel=0&turn=on&brightness=80&white=255&red=10&green=20&blue=30&gain=90'
        );
    });
});

describe('cloud v1 — bulk control', () => {
    it('appends the device list as a JSON array', () => {
        const request = buildRequestV1({ type: 'relays', turn: 'on', devices: ['a_0', 'b_1'] });

        assert.equal(request.route, '/device/relay/bulk_control');
        assert.equal(request.params, 'turn=on&devices=["a_0","b_1"]');
    });
});

describe('cloud v1 — reads', () => {
    it('builds a status request', () => {
        const request = buildRequestV1({ type: 'status', id: 'abc123' });

        assert.equal(request.route, '/device/status');
        assert.equal(request.params, 'id=abc123');
    });

    it('builds an all_status request and encodes booleans', () => {
        const request = buildRequestV1({ type: 'all_status', show_info: true, no_shared: false });

        assert.equal(request.route, '/device/all_status');
        assert.equal(request.params, 'show_info=true&no_shared=false');
    });

    it('builds an all_status request with no options at all', () => {
        const request = buildRequestV1({ type: 'all_status' });

        assert.equal(request.params, '');
    });
});

describe('cloud v1 — unknown commands', () => {
    it('returns undefined for a v2 command sent to a v1 connection', () => {
        // The commonest mistake once both versions exist. The node turns this into an error
        // naming the configured version rather than doing nothing.
        assert.equal(buildRequestV1({ type: 'switch', id: 'abc123', on: true }), undefined);
        assert.equal(buildRequestV1({ type: 'cover', id: 'abc123', position: 50 }), undefined);
        assert.equal(buildRequestV1({ type: 'get', ids: ['abc123'] }), undefined);
    });

    it('returns undefined when no type is given', () => {
        assert.equal(buildRequestV1({ id: 'abc123' }), undefined);
    });
});
