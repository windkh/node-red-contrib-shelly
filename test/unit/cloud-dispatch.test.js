const { describe, it, beforeEach, afterEach, after } = require('node:test');
const assert = require('node:assert/strict');
const nock = require('nock');

const { handleInput } = require('../../shelly/nodes/cloud/dispatch.js');
const { makeFakeNode } = require('../../test-helpers/fake-node.js');

nock.disableNetConnect();

beforeEach(() => {
    nock.cleanAll();
});

afterEach(() => {
    if (!nock.isDone()) {
        const pending = nock.pendingMocks();
        nock.cleanAll();
        throw new Error('nock has unmet expectations: ' + pending.join(', '));
    }
});

after(() => {
    nock.enableNetConnect();
});

const HOST = 'https://shelly-99-eu.shelly.cloud';
const AUTH = 'abc123authkey';

// What the dispatcher owes the flow: pick the parser for the connection's API version, hand
// the result to the transport, and report the outcome through the node's own surface. The
// wire format is pinned in cloud-transport.test.js and the payload vocabularies in
// cloud-v1/v2.test.js, so nock here only stands in for a reachable cloud.
function makeCloudNode(apiVersion) {
    return makeFakeNode({
        type: 'shelly-cloud',
        server: {
            apiVersion: apiVersion,
            getCredentials: () => ({ serverUri: HOST, authKey: AUTH }),
        },
    });
}

describe('cloud dispatch — a successful command', () => {
    it('reports green and emits the response body', async () => {
        nock(HOST)
            .post('/v2/devices/api/set/groups')
            .query({ auth_key: AUTH })
            .reply(200, { failedCommands: { b48a0a1cd978_1: 'DEVICE_OFFLINE' } });

        const harness = makeCloudNode('v2');
        await handleInput(harness.node, {
            payload: { type: 'groups', switch: { ids: ['b48a0a1cd978_0'], command: { on: true } } },
        });

        assert.equal(harness.errors.length, 0);
        assert.equal(harness.sends.length, 1);
        assert.deepEqual(harness.sends[0][0].payload, { failedCommands: { b48a0a1cd978_1: 'DEVICE_OFFLINE' } });
        const last = harness.statuses[harness.statuses.length - 1];
        assert.equal(last.fill, 'green');
    });

    it('emits an empty payload when v2 answers a control command with no body', async () => {
        nock(HOST).post('/v2/devices/api/set/switch').query({ auth_key: AUTH }).reply(200, '');

        const harness = makeCloudNode('v2');
        await handleInput(harness.node, { payload: { type: 'switch', id: 'b48a0a1cd978', on: false } });

        assert.equal(harness.sends.length, 1);
        assert.equal(harness.sends[0][0].payload, '');
    });

    it('routes a v1 payload through the v1 parser when the connection is v1', async () => {
        nock(HOST)
            .post('/device/relay/control')
            .reply(200, { isok: true, data: { device_id: 'F13f0d' } });

        const harness = makeCloudNode('v1');
        await handleInput(harness.node, { payload: { type: 'relay', id: 'F13f0d', channel: 0, turn: 'on' } });

        assert.equal(harness.sends.length, 1);
        assert.deepEqual(harness.sends[0][0].payload, { isok: true, data: { device_id: 'F13f0d' } });
    });
});

describe('cloud dispatch — a failing command', () => {
    it('reports the cloud error string and detail rather than a bare status code', async () => {
        nock(HOST)
            .post('/v2/devices/api/get')
            .query({ auth_key: AUTH })
            .reply(400, { error: 'DEVICE_OFFLINE', data: { messages: ['device b48a0a1cd978 is offline'] } });

        const harness = makeCloudNode('v2');
        await handleInput(harness.node, { payload: { type: 'get', id: 'b48a0a1cd978' } });

        assert.equal(harness.errors.length, 1);
        assert.match(harness.errors[0].message, /DEVICE_OFFLINE/);
        assert.match(harness.errors[0].message, /is offline/);
        assert.equal(harness.sends.length, 0, 'a failed command must not emit a message');
    });
});

describe('cloud dispatch — unrecognised commands are reported', () => {
    it('names the command and the configured version when a v1 payload hits a v2 connection', async () => {
        // No nock interceptor: with disableNetConnect any request would fail the test, which
        // is the point — nothing must be sent.
        const harness = makeCloudNode('v2');
        await handleInput(harness.node, { payload: { type: 'relay', id: 'F13f0d', turn: 'on' } });

        assert.equal(harness.errors.length, 1);
        assert.match(harness.errors[0].message, /unknown command "relay"/);
        assert.match(harness.errors[0].message, /cloud API v2/);
        assert.equal(harness.sends.length, 0);
        const last = harness.statuses[harness.statuses.length - 1];
        assert.equal(last.fill, 'red');
    });

    it('passes the message to the error so a catch node can handle it', async () => {
        const harness = makeCloudNode('v2');
        const msg = { payload: { type: 'relay' }, _msgid: 'abc' };
        await handleInput(harness.node, msg);

        assert.equal(harness.errors[0].msg, msg);
    });

    it('reports a payload that carries no command at all', async () => {
        const harness = makeCloudNode('v1');
        await handleInput(harness.node, { payload: { id: 'F13f0d' } });

        assert.match(harness.errors[0].message, /unknown command "undefined"|no command/);
        assert.equal(harness.sends.length, 0);
    });
});
