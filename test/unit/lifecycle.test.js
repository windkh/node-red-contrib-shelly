const { describe, it, beforeEach, afterEach, after } = require('node:test');
const assert = require('node:assert/strict');
const nock = require('nock');

const {
    shellyPing,
    tryCheckDeviceType,
    start,
    describeError,
    reportInitializationError,
} = require('../../shelly/lib/shelly.js');
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

const HOST = 'shellydevice.test';

describe('shellyPing', () => {
    it('returns true and reports green status on a matching gen 1 device', async () => {
        const harness = makeFakeNode({ type: 'shelly-gen1', hostname: HOST });
        nock('http://' + HOST)
            .get('/shelly')
            .reply(200, { type: 'SHSW-1' });

        const found = await shellyPing(harness.node, { hostname: HOST }, ['SHSW-']);

        assert.equal(found, true);
        assert.equal(harness.node.shellyInfo.type, 'SHSW-1');
        const last = harness.statuses[harness.statuses.length - 1];
        assert.equal(last.fill, 'green');
        assert.match(last.text, /Connected/);
    });

    it('returns true on a matching gen 2 device', async () => {
        const harness = makeFakeNode({ type: 'shelly-gen2', hostname: HOST });
        nock('http://' + HOST)
            .get('/shelly')
            .reply(200, { model: 'SNSW-001X16EU', gen: 2 });

        const found = await shellyPing(harness.node, { hostname: HOST }, ['SNSW-']);

        assert.equal(found, true);
    });

    it('returns true for a gen 3 device when configured node type is shelly-gen2', async () => {
        // ADR-009: gens 3/4 reuse the gen 2 code path.
        const harness = makeFakeNode({ type: 'shelly-gen2', hostname: HOST });
        nock('http://' + HOST)
            .get('/shelly')
            .reply(200, { model: 'S3SW-001X16EU', gen: 3 });

        const found = await shellyPing(harness.node, { hostname: HOST }, ['S3SW-']);

        assert.equal(found, true);
    });

    it('returns true for a gen 4 device under the shelly-gen2 node type', async () => {
        const harness = makeFakeNode({ type: 'shelly-gen2', hostname: HOST });
        nock('http://' + HOST)
            .get('/shelly')
            .reply(200, { model: 'S4SW-001X16EU', gen: 4 });

        const found = await shellyPing(harness.node, { hostname: HOST }, ['S4SW-']);

        assert.equal(found, true);
    });

    it('returns false on a device-type mismatch and reports red status', async () => {
        // Device is a Dimmer but caller passed Relay prefixes.
        const harness = makeFakeNode({ type: 'shelly-gen1', hostname: HOST });
        nock('http://' + HOST)
            .get('/shelly')
            .reply(200, { type: 'SHDM-1' });

        const found = await shellyPing(harness.node, { hostname: HOST }, ['SHSW-']);

        assert.equal(found, false);
        const last = harness.statuses[harness.statuses.length - 1];
        assert.equal(last.fill, 'red');
        assert.match(last.text, /Shelly type mismatch/);
    });

    it('returns false on a node-type mismatch (gen2 node querying a gen1 device)', async () => {
        const harness = makeFakeNode({ type: 'shelly-gen2', hostname: HOST });
        nock('http://' + HOST)
            .get('/shelly')
            .reply(200, { type: 'SHSW-1' });

        const found = await shellyPing(harness.node, { hostname: HOST }, ['SNSW-']);

        assert.equal(found, false);
        const last = harness.statuses[harness.statuses.length - 1];
        assert.equal(last.fill, 'red');
        assert.match(last.text, /Wrong node type.*shelly-gen1/);
    });

    it('returns false and a Ping error on a network failure', async () => {
        // No nock interceptor registered → DNS lookup fails. shellyRequestAsync
        // throws, shellyPing catches and reports a red status.
        const harness = makeFakeNode({ type: 'shelly-gen1', hostname: 'no-such-host.invalid' });
        nock('http://no-such-host.invalid').get('/shelly').replyWithError('ENOTFOUND');

        const found = await shellyPing(harness.node, { hostname: 'no-such-host.invalid' }, ['SHSW-']);

        assert.equal(found, false);
        const last = harness.statuses[harness.statuses.length - 1];
        assert.equal(last.fill, 'red');
        assert.match(last.text, /^Ping:/);
    });

    it('warns on a network failure when node.verbose is true', async () => {
        const harness = makeFakeNode({ type: 'shelly-gen1', hostname: 'no-such-host.invalid', verbose: true });
        nock('http://no-such-host.invalid').get('/shelly').replyWithError('ENOTFOUND');

        await shellyPing(harness.node, { hostname: 'no-such-host.invalid' }, ['SHSW-']);

        assert.equal(harness.warnings.length, 1);
    });
});

describe('tryCheckDeviceType', () => {
    it('returns true on a matching gen 1 device and shows the device type in the status', async () => {
        const harness = makeFakeNode({ type: 'shelly-gen1', hostname: HOST });
        nock('http://' + HOST)
            .get('/shelly')
            .reply(200, { type: 'SHSW-1' });

        const success = await tryCheckDeviceType(harness.node, ['SHSW-']);

        assert.equal(success, true);
        const last = harness.statuses[harness.statuses.length - 1];
        assert.equal(last.fill, 'green');
        assert.match(last.text, /SHSW-1/);
    });

    it('returns false on a device-type mismatch and surfaces the issue link', async () => {
        const harness = makeFakeNode({ type: 'shelly-gen1', hostname: HOST });
        nock('http://' + HOST)
            .get('/shelly')
            .reply(200, { type: 'SHDM-1' });

        const success = await tryCheckDeviceType(harness.node, ['SHSW-']);

        assert.equal(success, false);
        // The warn message should include the issue-tracker URL.
        assert.ok(harness.warnings.some((w) => /github.com\/windkh\/node-red-contrib-shelly\/issues/.test(w)));
    });

    it('returns false on a node-type mismatch', async () => {
        const harness = makeFakeNode({ type: 'shelly-gen2', hostname: HOST });
        nock('http://' + HOST)
            .get('/shelly')
            .reply(200, { type: 'SHSW-1' });

        const success = await tryCheckDeviceType(harness.node, ['SNSW-']);

        assert.equal(success, false);
        assert.ok(harness.warnings.some((w) => /Wrong node type/.test(w)));
    });

    it('yields a "Waiting for device..." status when the device is unreachable', async () => {
        const harness = makeFakeNode({ type: 'shelly-gen1', hostname: HOST });
        nock('http://' + HOST)
            .get('/shelly')
            .replyWithError('connect ECONNREFUSED');

        const success = await tryCheckDeviceType(harness.node, ['SHSW-']);

        assert.equal(success, false);
        const last = harness.statuses[harness.statuses.length - 1];
        assert.equal(last.fill, 'yellow');
        assert.match(last.text, /Waiting for device/);
    });

    it('reports "Hostname not configured" without a request when the hostname is blank', async () => {
        // nock.disableNetConnect() plus the afterEach unmet-mock check means any
        // request attempt here would fail the test.
        const harness = makeFakeNode({ type: 'shelly-gen1', hostname: '' });

        const success = await tryCheckDeviceType(harness.node, ['SHSW-']);

        assert.equal(success, false);
        const last = harness.statuses[harness.statuses.length - 1];
        assert.equal(last.fill, 'red');
        assert.match(last.text, /Hostname not configured/);
    });

    it('names the reason in the status and in node.lastError when the host does not resolve', async () => {
        // #277: a name that resolves in the browser but not for the Node-RED process
        // used to be indistinguishable from a wrong IP or a sleeping device.
        const harness = makeFakeNode({ type: 'shelly-gen1', hostname: HOST });
        nock('http://' + HOST)
            .get('/shelly')
            .replyWithError('getaddrinfo ENOTFOUND ' + HOST);

        await tryCheckDeviceType(harness.node, ['SHSW-']);

        const last = harness.statuses[harness.statuses.length - 1];
        assert.match(last.text, /ENOTFOUND/);
        assert.match(harness.node.lastError, /ENOTFOUND/);
    });

    it('clears node.lastError once the device answers again', async () => {
        const harness = makeFakeNode({ type: 'shelly-gen1', hostname: HOST });
        harness.node.lastError = 'getaddrinfo ENOTFOUND ' + HOST;
        nock('http://' + HOST)
            .get('/shelly')
            .reply(200, { type: 'SHSW-1' });

        await tryCheckDeviceType(harness.node, ['SHSW-']);

        assert.equal(harness.node.lastError, undefined);
    });

    it('returns true for gen 3 and gen 4 devices when typed as shelly-gen2', async () => {
        // One assert per generation to stay independent.
        let harness = makeFakeNode({ type: 'shelly-gen2', hostname: HOST });
        nock('http://' + HOST)
            .get('/shelly')
            .reply(200, { model: 'S3SW-001X16EU', gen: 3 });
        assert.equal(await tryCheckDeviceType(harness.node, ['S3SW-']), true);

        harness = makeFakeNode({ type: 'shelly-gen2', hostname: HOST });
        nock('http://' + HOST)
            .get('/shelly')
            .reply(200, { model: 'S4SW-001X16EU', gen: 4 });
        assert.equal(await tryCheckDeviceType(harness.node, ['S4SW-']), true);
    });
});

describe('start (polling lifecycle)', () => {
    it('shows red "Hostname not configured" when hostname is empty', async () => {
        const harness = makeFakeNode({ type: 'shelly-gen1', hostname: '' });

        await start(harness.node, ['SHSW-']);

        const last = harness.statuses[harness.statuses.length - 1];
        assert.equal(last.fill, 'red');
        assert.match(last.text, /Hostname not configured/);
        assert.equal(harness.node.pollingTimer, undefined);
    });

    it('shows yellow "Polling is turned off" when pollInterval is 0', async () => {
        const harness = makeFakeNode({ type: 'shelly-gen1', hostname: HOST, pollInterval: 0 });
        // start() still issues the initial shellyPing, so nock for that.
        nock('http://' + HOST)
            .get('/shelly')
            .reply(200, { type: 'SHSW-1' });

        await start(harness.node, ['SHSW-']);

        const yellowOff = harness.statuses.find((s) => s.fill === 'yellow' && /Polling is turned off/.test(s.text));
        assert.ok(yellowOff, 'expected a yellow "Polling is turned off" status');
        assert.equal(harness.node.pollingTimer, undefined);
    });

    it('sets up a pollingTimer when hostname and pollInterval > 0', async () => {
        const harness = makeFakeNode({ type: 'shelly-gen1', hostname: HOST, pollInterval: 60000 });
        nock('http://' + HOST)
            .get('/shelly')
            .reply(200, { type: 'SHSW-1' });

        await start(harness.node, ['SHSW-']);

        try {
            assert.ok(harness.node.pollingTimer, 'expected pollingTimer to be set');
            assert.equal(harness.node.online, true);
        } finally {
            clearInterval(harness.node.pollingTimer);
        }
    });

    it('initial reachability sets node.online = false when device responds with wrong type', async () => {
        const harness = makeFakeNode({ type: 'shelly-gen1', hostname: HOST, pollInterval: 60000 });
        // Returns a Dimmer when we asked for a Relay → found=false.
        nock('http://' + HOST)
            .get('/shelly')
            .reply(200, { type: 'SHDM-1' });

        await start(harness.node, ['SHSW-']);

        try {
            assert.equal(harness.node.online, false);
        } finally {
            clearInterval(harness.node.pollingTimer);
        }
    });

    it('puts the transport reason on msg.error.reason when a poll loses the device', async () => {
        const harness = makeFakeNode({ type: 'shelly-gen1', hostname: HOST, pollInterval: 20 });
        nock('http://' + HOST)
            .get('/shelly')
            .reply(200, { type: 'SHSW-1' });
        nock('http://' + HOST)
            .get('/shelly')
            .replyWithError('getaddrinfo ENOTFOUND ' + HOST);

        await start(harness.node, ['SHSW-']);

        try {
            // One poll tick: online true → false, which is the transition that sends.
            await new Promise((resolve) => setTimeout(resolve, 60));
            const sent = harness.sends.map((s) => s[0]).find((m) => m && m.error);
            assert.ok(sent, 'expected an error message on the offline transition');
            assert.match(sent.error.reason, /ENOTFOUND/);
            assert.match(sent.error.message, /Device is not reachable/);
        } finally {
            clearInterval(harness.node.pollingTimer);
        }
    });
});

describe('describeError', () => {
    it('leaves the message alone when it already names the code', () => {
        const error = new Error('getaddrinfo ENOTFOUND shelly.local');
        error.code = 'ENOTFOUND';

        assert.equal(describeError(error), 'getaddrinfo ENOTFOUND shelly.local');
    });

    it('appends the code when the message does not carry it', () => {
        // axios timeouts read "timeout of 5000ms exceeded" and never say which layer
        // gave up; ECONNABORTED is the part that distinguishes them.
        const error = new Error('timeout of 5000ms exceeded');
        error.code = 'ECONNABORTED';

        assert.equal(describeError(error), 'timeout of 5000ms exceeded (ECONNABORTED)');
    });

    it('falls back to the bare message when there is no code', () => {
        assert.equal(describeError(new Error('Not Found /shelly')), 'Not Found /shelly');
    });
});

describe('reportInitializationError', () => {
    // #261: an initializer runs from an async IIFE and from a setInterval callback, neither of
    // which observes a rejection — anything escaping it used to kill the node-red process.

    it('reports a red status naming the reason', () => {
        const harness = makeFakeNode({ type: 'shelly-gen2', hostname: HOST });

        reportInitializationError(
            harness.node,
            new Error("Cannot read properties of undefined (reading '_currentUrl')")
        );

        const last = harness.statuses[harness.statuses.length - 1];
        assert.equal(last.fill, 'red');
        assert.match(last.text, /Initialization failed/);
        assert.match(last.text, /_currentUrl/);
    });

    it('logs the failure once so a retry loop cannot flood the log', () => {
        // The field report was 1465 restarts against one rate-limiting device; the timer
        // now keeps retrying instead, which must not turn into one log line per interval.
        const harness = makeFakeNode({ type: 'shelly-gen2', hostname: HOST });
        const error = new Error('Request failed with status code 429');

        reportInitializationError(harness.node, error);
        reportInitializationError(harness.node, error);
        reportInitializationError(harness.node, error);

        assert.equal(harness.errors.length, 1);
        // The status is still refreshed every time, only the log is deduplicated.
        assert.equal(harness.statuses.length, 3);
    });

    it('logs again once the reason changes', () => {
        const harness = makeFakeNode({ type: 'shelly-gen2', hostname: HOST });

        reportInitializationError(harness.node, new Error('Request failed with status code 429'));
        reportInitializationError(harness.node, new Error('getaddrinfo ENOTFOUND ' + HOST));

        assert.equal(harness.errors.length, 2);
        assert.match(harness.errors[1], /ENOTFOUND/);
    });

    it('carries the error code through describeError', () => {
        const harness = makeFakeNode({ type: 'shelly-gen2', hostname: HOST });
        const error = new Error('timeout of 5000ms exceeded');
        error.code = 'ECONNABORTED';

        reportInitializationError(harness.node, error);

        assert.match(harness.errors[0], /ECONNABORTED/);
    });
});
