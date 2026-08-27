const { describe, it, beforeEach, afterEach, after } = require('node:test');
const assert = require('node:assert/strict');
const nock = require('nock');
const axios = require('axios').default;
const crypto = require('node:crypto');

const { shellyRequestAsync } = require('../../shelly/lib/shelly.js');

// Real network calls in this file are an error — anything that bypasses nock is a test bug.
nock.disableNetConnect();

beforeEach(() => {
    nock.cleanAll();
});

afterEach(() => {
    // If a test scoped an interceptor but the request never fired, surface it.
    if (!nock.isDone()) {
        const pending = nock.pendingMocks();
        nock.cleanAll();
        throw new Error('nock has unmet expectations: ' + pending.join(', '));
    }
});

after(() => {
    nock.enableNetConnect();
});

const HOST = 'shellydevice.test';
const URL = 'http://' + HOST;

describe('shellyRequestAsync — basic 200', () => {
    it('returns the response body on GET 200 with no auth', async () => {
        nock(URL).get('/shelly').reply(200, { type: 'SHSW-1', mac: 'AABBCC112233' });

        const result = await shellyRequestAsync(axios, 'GET', '/shelly', null, null, { hostname: HOST });

        assert.deepEqual(result, { type: 'SHSW-1', mac: 'AABBCC112233' });
    });

    it('passes query string params', async () => {
        nock(URL).get('/relay/0').query({ turn: 'on', timer: '5' }).reply(200, { ison: true });

        const result = await shellyRequestAsync(axios, 'GET', '/relay/0', { turn: 'on', timer: 5 }, null, {
            hostname: HOST,
        });

        assert.deepEqual(result, { ison: true });
    });

    it('passes POST body data as JSON', async () => {
        nock(URL)
            .post('/rpc', { id: 1, method: 'Switch.Set', params: { id: 0, on: true } })
            .reply(200, { result: { was_on: false } });

        const result = await shellyRequestAsync(
            axios,
            'POST',
            '/rpc',
            null,
            { id: 1, method: 'Switch.Set', params: { id: 0, on: true } },
            { hostname: HOST }
        );

        assert.deepEqual(result, { result: { was_on: false } });
    });
});

describe('shellyRequestAsync — Basic auth (gen 1)', () => {
    it('attaches an Authorization: Basic header when credentials.authType=Basic', async () => {
        nock(URL)
            .get('/relay/0')
            .matchHeader('Authorization', 'Basic ' + Buffer.from('admin:hunter2').toString('base64'))
            .reply(200, { ison: false });

        const result = await shellyRequestAsync(axios, 'GET', '/relay/0', null, null, {
            hostname: HOST,
            authType: 'Basic',
            username: 'admin',
            password: 'hunter2',
        });

        assert.deepEqual(result, { ison: false });
    });

    it('does not attach an Authorization header when credentials.authType is omitted', async () => {
        nock(URL)
            .get('/shelly')
            .matchHeader('Authorization', (val) => val === undefined)
            .reply(200, { type: 'SHSW-1' });

        await shellyRequestAsync(axios, 'GET', '/shelly', null, null, { hostname: HOST });
    });

    it('does not attach an Authorization header when Basic credentials are missing username/password', async () => {
        nock(URL)
            .get('/shelly')
            .matchHeader('Authorization', (val) => val === undefined)
            .reply(200, { type: 'SHSW-1' });

        await shellyRequestAsync(axios, 'GET', '/shelly', null, null, { hostname: HOST, authType: 'Basic' });
    });
});

describe('shellyRequestAsync — Digest auth (gen 2+) 401 retry', () => {
    it('transparently retries with a Digest header after a 401 challenge', async () => {
        // First call: no auth header; device responds 401 with a Digest challenge.
        nock(URL).get('/rpc/Switch.GetStatus').reply(401, 'Unauthorized', {
            'www-authenticate': 'Digest qop="auth", realm="shellypro1pm", nonce="abc123", algorithm=SHA-256',
        });

        // Second call: must carry an Authorization: Digest ... header. Match
        // partial values — the exact cnonce is nondeterministic, but nc is not:
        // the nonce is fresh, so it is always its first use.
        nock(URL)
            .get('/rpc/Switch.GetStatus')
            .matchHeader('Authorization', (val) => {
                return (
                    typeof val === 'string' &&
                    val.startsWith('Digest username="admin"') &&
                    val.includes('realm="shellypro1pm"') &&
                    val.includes('nonce="abc123"') &&
                    val.includes('uri="/rpc/Switch.GetStatus"') &&
                    val.includes('qop=auth') &&
                    val.includes('algorithm=SHA-256') &&
                    val.includes('nc=00000001') &&
                    /response="[a-f0-9]+"/.test(val)
                );
            })
            .reply(200, { id: 0, output: true });

        const result = await shellyRequestAsync(axios, 'GET', '/rpc/Switch.GetStatus', null, null, {
            hostname: HOST,
            authType: 'Digest',
            // shellyRequestAsync uses credentials.username/password; the
            // factory in getCredentials forces 'admin' for Digest, but
            // here we test the transport directly so we pass it explicitly.
            username: 'admin',
            password: 'topsecret',
        });

        assert.deepEqual(result, { id: 0, output: true });
    });

    // Firmware 2.0.0 validates the nonce count per nonce (RFC 7616). A module-global counter that
    // survived between requests sent 00000002, 00000003, … against nonces that were each brand new,
    // and every authenticated call failed with "Unauthorized". See #296.
    it('sends nc=00000001 on every request, not an ever-increasing counter', async () => {
        const sentCounts = [];

        for (const nonce of ['first-nonce', 'second-nonce']) {
            nock(URL)
                .get('/rpc/Shelly.GetStatus')
                .reply(401, 'Unauthorized', {
                    'www-authenticate':
                        'Digest qop="auth", realm="shellypmmini", nonce="' + nonce + '", algorithm=SHA-256',
                });

            nock(URL)
                .get('/rpc/Shelly.GetStatus')
                .matchHeader('Authorization', (val) => {
                    sentCounts.push(/nc=([0-9]{8})/.exec(val)[1]);
                    return true;
                })
                .reply(200, { ok: true });

            await shellyRequestAsync(axios, 'GET', '/rpc/Shelly.GetStatus', null, null, {
                hostname: HOST,
                authType: 'Digest',
                username: 'admin',
                password: 'topsecret',
            });
        }

        assert.deepEqual(sentCounts, ['00000001', '00000001']);
    });

    it('throws when the digest retry itself is rejected with a non-200, non-401 status', async () => {
        nock(URL).get('/rpc/Switch.Set').reply(401, '', {
            'www-authenticate': 'Digest qop="auth", realm="r", nonce="n", algorithm=SHA-256',
        });

        // axios sees this as a non-allowed status (only 200/401 pass), so it throws.
        // The catch in shellyRequestAsync re-throws with the response body folded in
        // (since 11.10.1). The body here is an empty string — the message ends with " - ".
        nock(URL).get('/rpc/Switch.Set').reply(403, 'forbidden');

        await assert.rejects(
            shellyRequestAsync(axios, 'GET', '/rpc/Switch.Set', null, null, {
                hostname: HOST,
                authType: 'Digest',
                username: 'admin',
                password: 'x',
            }),
            /forbidden/
        );
    });
});

describe('shellyRequestAsync — Digest challenge parsing', () => {
    const CREDENTIALS = { hostname: HOST, authType: 'Digest', username: 'admin', password: 'topsecret' };

    // Drives one full 401 -> retry cycle against the given challenge and hands back the
    // Authorization header the device would have received.
    async function captureAuthorization(challenge) {
        let sent;

        nock(URL).get('/rpc/Shelly.GetStatus').reply(401, 'Unauthorized', { 'www-authenticate': challenge });
        nock(URL)
            .get('/rpc/Shelly.GetStatus')
            .matchHeader('Authorization', (val) => {
                sent = val;
                return true;
            })
            .reply(200, { ok: true });

        await shellyRequestAsync(axios, 'GET', '/rpc/Shelly.GetStatus', null, null, CREDENTIALS);

        return sent;
    }

    it('reads realm and nonce from the challenge Shelly sends today', async () => {
        const sent = await captureAuthorization(
            'Digest qop="auth", realm="shellypmmini-abc", nonce="1234567890", algorithm=SHA-256'
        );

        assert.match(sent, /realm="shellypmmini-abc"/);
        assert.match(sent, /nonce="1234567890"/);
    });

    // Splitting each parameter on every '=' and keeping field [1] truncated the value at its first
    // '=' — a base64 nonce lost its padding, so the hash was computed over a different nonce than
    // the device had issued and the retry came back Unauthorized.
    it('keeps a base64 nonce whose padding contains =', async () => {
        const sent = await captureAuthorization(
            'Digest qop="auth", realm="shellypmmini-abc", nonce="YWJjZGVmZw==", algorithm=SHA-256'
        );

        assert.match(sent, /nonce="YWJjZGVmZw=="/);

        // The echoed nonce alone would not prove the hash used it, so recompute the response the way
        // the device does and require a match.
        const sha256 = (str) => crypto.createHash('sha256').update(str).digest('hex');
        const cnonce = /cnonce="([a-f0-9]+)"/.exec(sent)[1];
        const ha1 = sha256('admin:shellypmmini-abc:topsecret');
        const ha2 = sha256('GET:/rpc/Shelly.GetStatus');
        const expected = sha256(ha1 + ':YWJjZGVmZw==:00000001:' + cnonce + ':auth:' + ha2);

        assert.match(sent, new RegExp('response="' + expected + '"'));
    });

    // RFC 7235 makes the whitespace after the separating comma optional. Splitting on the literal
    // ', ' collapsed such a challenge into a single token, leaving realm and nonce undefined.
    it('accepts a challenge with no whitespace after the commas', async () => {
        const sent = await captureAuthorization(
            'Digest qop="auth",realm="shellypmmini-abc",nonce="1234567890",algorithm=SHA-256'
        );

        assert.match(sent, /realm="shellypmmini-abc"/);
        assert.match(sent, /nonce="1234567890"/);
    });

    it('keeps a quoted realm that contains a comma', async () => {
        const sent = await captureAuthorization(
            'Digest qop="auth", realm="Shelly, Gen3", nonce="1234567890", algorithm=SHA-256'
        );

        assert.match(sent, /realm="Shelly, Gen3"/);
        assert.match(sent, /nonce="1234567890"/);
    });

    // Previously the missing values were hashed as the string "undefined", producing a header the
    // device rejected — reported to the user as a bare "Unauthorized /rpc/Shelly.GetStatus", which
    // is exactly what a wrong password looks like.
    it('names the malformed challenge instead of hashing an absent realm or nonce', async () => {
        nock(URL).get('/rpc/Shelly.GetStatus').reply(401, 'Unauthorized', {
            'www-authenticate': 'Digest qop="auth", algorithm=SHA-256',
        });

        await assert.rejects(
            shellyRequestAsync(axios, 'GET', '/rpc/Shelly.GetStatus', null, null, CREDENTIALS),
            /Malformed digest challenge/
        );
    });
});

describe('shellyRequestAsync — error body enrichment (11.10.1)', () => {
    it('folds a JSON error body into the thrown error message', async () => {
        nock(URL)
            .post('/rpc')
            .reply(400, { id: 1, src: 'shellyplus1', error: { code: -103, message: "Argument 'id' is missing" } });

        await assert.rejects(
            shellyRequestAsync(
                axios,
                'POST',
                '/rpc',
                null,
                { id: 1, method: 'Switch.Set', params: {} },
                { hostname: HOST }
            ),
            (error) => {
                // Standard axios message stays present and the device body is appended.
                assert.match(error.message, /Request failed with status code 400/);
                assert.match(error.message, /Argument 'id' is missing/);
                assert.match(error.message, /-103/);
                return true;
            }
        );
    });

    it('folds a plain-text error body into the thrown error message', async () => {
        nock(URL).get('/diag').reply(500, 'internal server error');

        await assert.rejects(
            shellyRequestAsync(axios, 'GET', '/diag', null, null, { hostname: HOST }),
            /internal server error/
        );
    });

    it('still throws even when there is no response body', async () => {
        nock(URL).get('/zero-body').reply(503);

        await assert.rejects(shellyRequestAsync(axios, 'GET', '/zero-body', null, null, { hostname: HOST }));
    });

    it('drops .request from the enriched error and keeps the axios original as .cause', async () => {
        // #261: the enriched error is a fresh Error, so it carries none of axios's own
        // properties — callers that read error.request must not dereference it blindly.
        // A 429 mid-upload is the case that took node-red down in the field.
        nock(URL).post('/rpc/Script.PutCode').reply(429, 'Too Many Requests');

        await assert.rejects(
            shellyRequestAsync(axios, 'POST', '/rpc/Script.PutCode', null, { id: 1 }, { hostname: HOST }),
            (error) => {
                assert.equal(error.request, undefined, 'enriched error must not be assumed to carry .request');
                assert.ok(error.cause, 'the axios original stays reachable as .cause');
                assert.ok(error.cause.request, 'and it is the one that actually has .request');
                return true;
            }
        );
    });
});

describe('shellyRequestAsync — timeouts', () => {
    it('applies the configured timeout (treats 0 as the default fallback)', async () => {
        // shellyRequestAsync coerces a zero / negative timeout to the 10002ms default.
        // We don't trigger the timeout here — we just confirm the call still works.
        nock(URL).get('/shelly').reply(200, { type: 'SHSW-1' });

        const result = await shellyRequestAsync(axios, 'GET', '/shelly', null, null, { hostname: HOST }, 0);

        assert.deepEqual(result, { type: 'SHSW-1' });
    });

    it('applies an explicit timeout value', async () => {
        nock(URL).get('/shelly').reply(200, { type: 'SHSW-1' });

        const result = await shellyRequestAsync(axios, 'GET', '/shelly', null, null, { hostname: HOST }, 1500);

        assert.deepEqual(result, { type: 'SHSW-1' });
    });
});
