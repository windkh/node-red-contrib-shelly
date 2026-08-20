const { describe, it, beforeEach, afterEach, after } = require('node:test');
const assert = require('node:assert/strict');
const nock = require('nock');

const {
    shellyCloudRequestAsync,
    shellyCloudRequestV2Async,
    getRequestTimeout,
} = require('../../shelly/nodes/cloud/transport.js');

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
const CREDENTIALS = { serverUri: HOST, authKey: AUTH };

// These assert what actually goes on the wire: the module under test issues real axios calls
// and nock intercepts them. Request *building* is pinned separately in cloud-v1/v2.test.js —
// here the input is already a route plus a body, and only the transport shape is under test.
//
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

        await shellyCloudRequestV2Async(
            '/v2/devices/api/set/switch',
            { id: 'b48a0a1cd978', channel: 0, on: true },
            CREDENTIALS
        );

        // The spec's field names, and on as a real boolean rather than the v1 "on" string.
        assert.deepEqual(seenBody, { id: 'b48a0a1cd978', channel: 0, on: true });
    });

    it('returns an empty body, because v2 answers a control command with no body', async () => {
        // Documented behaviour rather than an oversight: the spec says success is "indicated
        // only by HTTP 200 OK" with no body, so there is nothing to hand on. A failure raises
        // instead, so an empty result here means the command was accepted.
        nock(HOST).post('/v2/devices/api/set/switch').query({ auth_key: AUTH }).reply(200, '');

        const body = await shellyCloudRequestV2Async(
            '/v2/devices/api/set/switch',
            { id: 'b48a0a1cd978', on: false },
            CREDENTIALS
        );

        assert.equal(body, '');
    });

    it('hands back the body when there is one, such as a group failure map', async () => {
        nock(HOST)
            .post('/v2/devices/api/set/groups')
            .query({ auth_key: AUTH })
            .reply(200, { failedCommands: { b48a0a1cd978_1: 'DEVICE_OFFLINE' } });

        const body = await shellyCloudRequestV2Async(
            '/v2/devices/api/set/groups',
            { switch: { ids: ['b48a0a1cd978_0'], command: { on: true } } },
            CREDENTIALS
        );

        assert.deepEqual(body, { failedCommands: { b48a0a1cd978_1: 'DEVICE_OFFLINE' } });
    });

    it('raises the cloud error string and detail rather than a bare status code', async () => {
        nock(HOST)
            .post('/v2/devices/api/get')
            .query({ auth_key: AUTH })
            .reply(400, { error: 'DEVICE_OFFLINE', data: { messages: ['device b48a0a1cd978 is offline'] } });

        await assert.rejects(
            () => shellyCloudRequestV2Async('/v2/devices/api/get', { ids: ['b48a0a1cd978'] }, CREDENTIALS),
            (error) => {
                assert.match(error.message, /DEVICE_OFFLINE/);
                assert.match(error.message, /is offline/);
                return true;
            }
        );
    });
});

describe('cloud transport — v1 is unchanged', () => {
    it('posts a form-urlencoded body carrying the auth key', async () => {
        let seenBody;
        nock(HOST)
            .post('/device/relay/control', (body) => {
                seenBody = body;
                return true;
            })
            .reply(200, { isok: true, data: { device_id: 'F13f0d' } });

        const body = await shellyCloudRequestAsync(
            'POST',
            '/device/relay/control',
            'id=F13f0d&channel=0&turn=on',
            CREDENTIALS
        );

        // nock parses a urlencoded body into a null-prototype object, hence the spread.
        // The auth key travels in the body, not the query — that is the v1 shape.
        assert.deepEqual({ ...seenBody }, { auth_key: AUTH, id: 'F13f0d', channel: '0', turn: 'on' });
        assert.deepEqual(body, { isok: true, data: { device_id: 'F13f0d' } });
    });

    it('sends only the auth key when the command carries no parameters', async () => {
        let seenBody;
        nock(HOST)
            .post('/device/all_status', (body) => {
                seenBody = body;
                return true;
            })
            .reply(200, {});

        await shellyCloudRequestAsync('POST', '/device/all_status', undefined, CREDENTIALS);

        assert.deepEqual({ ...seenBody }, { auth_key: AUTH });
    });
});

describe('getRequestTimeout', () => {
    // Was unreachable while it sat inside the RED closure. A 0 from the config UI means
    // "not set" there, so it must not become an axios timeout of 0 — which axios reads as
    // "wait forever" and would hang the rate-limited queue behind it.
    it('falls back to 10s when the timeout is unset, null or zero', () => {
        assert.equal(getRequestTimeout(undefined), 10000);
        assert.equal(getRequestTimeout(null), 10000);
        assert.equal(getRequestTimeout(0), 10000);
    });

    it('keeps a configured timeout', () => {
        assert.equal(getRequestTimeout(2500), 2500);
    });
});
