const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { getCredentials, getShellyInfo } = require('../../shelly/lib/shelly.js');
const nock = require('nock');

// Helper: build a minimal "node" shape that getCredentials expects.
function fakeNode({ hostname = '', authType, username = '', password = '' } = {}) {
    return {
        hostname,
        authType,
        credentials: { username, password },
    };
}

describe('getCredentials', () => {
    it('reads hostname/username/password from msg.payload when present', () => {
        const node = fakeNode({ hostname: 'fallback', username: 'fb-user', password: 'fb-pass' });
        const msg = { payload: { hostname: '192.168.1.5', username: 'msg-user', password: 'msg-pass' } };

        assert.deepEqual(getCredentials(node, msg), {
            hostname: '192.168.1.5',
            authType: undefined,
            username: 'msg-user',
            password: 'msg-pass',
        });
    });

    it('falls back to node config when msg.payload is empty', () => {
        const node = fakeNode({ hostname: 'shelly.local', authType: 'Basic', username: 'admin', password: 'pw' });

        assert.deepEqual(getCredentials(node, undefined), {
            hostname: 'shelly.local',
            authType: 'Basic',
            username: 'admin',
            password: 'pw',
        });
    });

    it('falls back to node config when msg has no payload', () => {
        const node = fakeNode({ hostname: 'shelly.local', authType: 'Basic', username: 'admin', password: 'pw' });

        assert.deepEqual(getCredentials(node, {}), {
            hostname: 'shelly.local',
            authType: 'Basic',
            username: 'admin',
            password: 'pw',
        });
    });

    it('forces username to "admin" when authType is Digest', () => {
        // gen 2+ devices: the Shelly digest dance uses a fixed username 'admin'
        // regardless of what was configured. See ADR-008.
        const node = fakeNode({ hostname: 'plus1.local', authType: 'Digest', username: 'ignored', password: 'pw' });

        const result = getCredentials(node, undefined);
        assert.equal(result.username, 'admin');
        assert.equal(result.authType, 'Digest');
        assert.equal(result.password, 'pw');
    });

    it('still forces "admin" for Digest even when msg.payload provides a username', () => {
        const node = fakeNode({ hostname: 'plus1.local', authType: 'Digest', username: 'ignored', password: 'pw' });
        const msg = { payload: { username: 'attacker', password: 'override' } };

        const result = getCredentials(node, msg);
        assert.equal(result.username, 'admin');
        assert.equal(result.password, 'override'); // password override does take effect
    });

    it('trims surrounding whitespace off a hostname taken from msg.payload', () => {
        // 'http:// 10.0.0.5' does not resolve, so a padded value from a template or
        // a UI upstream would fail exactly like a wrong address. See #277.
        const node = fakeNode({ hostname: 'shelly.local' });
        const msg = { payload: { hostname: '  10.0.0.5  ' } };

        assert.equal(getCredentials(node, msg).hostname, '10.0.0.5');
    });

    it('strips a scheme pasted into msg.payload.hostname', () => {
        // 'http://' + 'http://10.0.0.5' is looked up as the host 'http'. See #277.
        const node = fakeNode({ hostname: 'shelly.local' });
        const msg = { payload: { hostname: 'http://10.0.0.5/' } };

        assert.equal(getCredentials(node, msg).hostname, '10.0.0.5');
    });

    it('falls back to the node hostname when msg.payload.hostname is only whitespace', () => {
        const node = fakeNode({ hostname: 'shelly.local' });
        const msg = { payload: { hostname: '   ' } };

        assert.equal(getCredentials(node, msg).hostname, 'shelly.local');
    });

    it('msg.payload partial override leaves other fields from node', () => {
        const node = fakeNode({ hostname: 'shelly.local', username: 'node-user', password: 'node-pw' });
        const msg = { payload: { hostname: '10.0.0.5' } };

        assert.deepEqual(getCredentials(node, msg), {
            hostname: '10.0.0.5',
            authType: undefined,
            username: 'node-user',
            password: 'node-pw',
        });
    });
});

describe('getShellyInfo', () => {
    it('returns the body of GET /shelly on a reachable host', async () => {
        nock('http://reachable.test').get('/shelly').reply(200, { type: 'SHSW-1', mac: 'AABBCC' });

        const info = await getShellyInfo('reachable.test');
        assert.deepEqual(info, { type: 'SHSW-1', mac: 'AABBCC' });
        nock.cleanAll();
    });

    it('returns an empty object when the device is unreachable', async () => {
        // No nock interceptor — and nock.disableNetConnect was already set
        // in transport.test.js. But credentials.test.js may run first or alone,
        // so we explicitly disable here too.
        nock.disableNetConnect();
        const info = await getShellyInfo('unreachable.test');
        assert.deepEqual(info, {});
        nock.enableNetConnect();
    });

    it('returns an empty object when the device returns an error status', async () => {
        nock('http://errors.test').get('/shelly').reply(500, 'boom');

        const info = await getShellyInfo('errors.test');
        assert.deepEqual(info, {});
        nock.cleanAll();
    });
});

// We can't fully test getIPAddresses() / getIPAddress(node) without mocking
// `os.networkInterfaces()` — leaving that for a future phase. They are exposed
// via the admin route in 99-shelly.js, which will be exercised in Phase 5.
