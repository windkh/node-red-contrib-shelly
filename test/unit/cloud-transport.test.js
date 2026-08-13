const { describe, it, beforeEach, afterEach, after } = require('node:test');
const assert = require('node:assert/strict');
const nock = require('nock');

const { makeFakeRed, makeFakeCloudServer } = require('../../test-helpers/fake-red.js');

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

// Builds a live cloud node on a fake runtime. This exercises the real transport — the module
// under test issues real axios calls, which nock intercepts — so these assert what actually
// goes on the wire, not what a parser intended.
function makeCloudNode(apiVersion) {
    const server = makeFakeCloudServer({ apiVersion: apiVersion, serverUri: HOST, authKey: AUTH });
    const harness = makeFakeRed(server);
    const ShellyCloudNode = require('../../shelly/nodes/cloud-node.js')(harness.RED);
    new ShellyCloudNode({ server: 'server-id' });
    return harness;
}

// The shared axios instance is rate limited to 1 request/second (ADR-005), so each test that
// issues a request costs about a second. Kept deliberately few.

describe('cloud transport — v2 request shape', () => {
    it('puts auth_key in the query string and the command in a JSON body', async () => {
        let seenBody;
        nock(HOST)
            .post('/v2/devices/api/set/switch', (body) => {
                seenBody = body;
                return true;
            })
            .query({ auth_key: AUTH })
            .matchHeader('content-type', /application\/json/)
            .reply(200, '');

        const harness = makeCloudNode('v2');
        await harness.send({ payload: { type: 'switch', id: 'b48a0a1cd978', channel: 0, on: true } });

        // The spec's field names, and on as a real boolean rather than the v1 "on" string.
        assert.deepEqual(seenBody, { id: 'b48a0a1cd978', channel: 0, on: true });
        assert.equal(harness.errors.length, 0);
        const last = harness.statuses[harness.statuses.length - 1];
        assert.equal(last.fill, 'green');
    });

    it('emits an empty payload on success, because v2 answers a control command with no body', async () => {
        // Documented behaviour rather than an oversight: the spec says success is "indicated
        // only by HTTP 200 OK" with no body, so there is nothing to hand on. A failure raises
        // an error instead, so an empty payload here means the command was accepted.
        nock(HOST).post('/v2/devices/api/set/switch').query({ auth_key: AUTH }).reply(200, '');

        const harness = makeCloudNode('v2');
        await harness.send({ payload: { type: 'switch', id: 'b48a0a1cd978', on: false } });

        assert.equal(harness.sends.length, 1);
        assert.equal(harness.sends[0][0].payload, '');
    });

    it('hands back the body when there is one, such as a group failure map', async () => {
        nock(HOST)
            .post('/v2/devices/api/set/groups')
            .query({ auth_key: AUTH })
            .reply(200, { failedCommands: { b48a0a1cd978_1: 'DEVICE_OFFLINE' } });

        const harness = makeCloudNode('v2');
        await harness.send({
            payload: { type: 'groups', switch: { ids: ['b48a0a1cd978_0'], command: { on: true } } },
        });

        assert.deepEqual(harness.sends[0][0].payload, { failedCommands: { b48a0a1cd978_1: 'DEVICE_OFFLINE' } });
    });

    it('reports the cloud error string and detail rather than a bare status code', async () => {
        nock(HOST)
            .post('/v2/devices/api/get')
            .query({ auth_key: AUTH })
            .reply(400, { error: 'DEVICE_OFFLINE', data: { messages: ['device b48a0a1cd978 is offline'] } });

        const harness = makeCloudNode('v2');
        await harness.send({ payload: { type: 'get', id: 'b48a0a1cd978' } });

        assert.equal(harness.errors.length, 1);
        assert.match(harness.errors[0].message, /DEVICE_OFFLINE/);
        assert.match(harness.errors[0].message, /is offline/);
        assert.equal(harness.sends.length, 0, 'a failed command must not emit a message');
    });
});

describe('cloud transport — v1 is unchanged', () => {
    it('still posts a form-urlencoded body carrying the auth key', async () => {
        let seenBody;
        nock(HOST)
            .post('/device/relay/control', (body) => {
                seenBody = body;
                return true;
            })
            .reply(200, { isok: true, data: { device_id: 'F13f0d' } });

        const harness = makeCloudNode('v1');
        await harness.send({ payload: { type: 'relay', id: 'F13f0d', channel: 0, turn: 'on' } });

        // nock parses a urlencoded body into a null-prototype object, hence the spread.
        // The auth key travels in the body, not the query — that is the v1 shape.
        assert.deepEqual({ ...seenBody }, { auth_key: AUTH, id: 'F13f0d', channel: '0', turn: 'on' });
        assert.equal(harness.sends.length, 1);
        assert.deepEqual(harness.sends[0][0].payload, { isok: true, data: { device_id: 'F13f0d' } });
    });
});

describe('cloud transport — unrecognised commands are reported', () => {
    it('names the command and the configured version when a v1 payload hits a v2 connection', async () => {
        // No nock interceptor: with disableNetConnect any request would fail the test, which
        // is the point — nothing must be sent.
        const harness = makeCloudNode('v2');
        await harness.send({ payload: { type: 'relay', id: 'F13f0d', turn: 'on' } });

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
        await harness.send(msg);

        assert.equal(harness.errors[0].msg, msg);
    });

    it('reports a payload that carries no command at all', async () => {
        const harness = makeCloudNode('v1');
        await harness.send({ payload: { id: 'F13f0d' } });

        assert.match(harness.errors[0].message, /unknown command "undefined"|no command/);
        assert.equal(harness.sends.length, 0);
    });
});
