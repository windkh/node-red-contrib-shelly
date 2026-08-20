const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const makeCloudNode = require('../../shelly/nodes/cloud-node.js');

// cloud-node.js is runtime glue: it wires a RED node to the tested modules under cloud/ and
// holds no logic of its own. What can still break here is the wiring — a wrong require path,
// a handler registered under the wrong event, a status that is never cleared — and none of
// that is visible from the dispatch tests, which call handleInput directly. So this loads the
// real module against a stub RED and asserts only that the wiring is in place.
//
// Deliberately a local stub and not a shared fake-RED helper: a shared harness invites tests
// to reach business logic through it, which is what put the transport inside this closure in
// the first place. Anything worth more than a wiring assertion belongs in cloud/.
function makeStubRed(server) {
    const handlers = {};
    const statuses = [];
    const errors = [];

    const RED = {
        nodes: {
            createNode: (node) => {
                node.status = (s) => statuses.push(s);
                node.error = (m, msg) => errors.push({ message: m, msg: msg });
                node.send = () => {};
                node.on = (event, handler) => {
                    handlers[event] = handler;
                };
            },
            getNode: () => server,
        },
    };

    return { RED: RED, handlers: handlers, statuses: statuses, errors: errors };
}

const SERVER = { apiVersion: 'v2', getCredentials: () => ({ serverUri: 'https://x.test', authKey: 'k' }) };

describe('cloud-node wiring', () => {
    it('registers an input and a close handler and clears the status on start', () => {
        const stub = makeStubRed(SERVER);
        const ShellyCloudNode = makeCloudNode(stub.RED);

        new ShellyCloudNode({ server: 'server-id' });

        assert.equal(typeof stub.handlers.input, 'function');
        assert.equal(typeof stub.handlers.close, 'function');
        assert.deepEqual(stub.statuses, [{}]);
    });

    it('resolves the configured server config node onto the node', () => {
        const stub = makeStubRed(SERVER);
        const ShellyCloudNode = makeCloudNode(stub.RED);

        const node = new ShellyCloudNode({ server: 'server-id' });

        assert.equal(node.server, SERVER);
    });

    it('routes an input message into the dispatcher', async () => {
        // An unrecognised command needs no network, and reaching node.error with the
        // dispatcher's wording proves the handler really delegates to cloud/dispatch.js.
        const stub = makeStubRed(SERVER);
        const ShellyCloudNode = makeCloudNode(stub.RED);
        new ShellyCloudNode({ server: 'server-id' });

        await stub.handlers.input({ payload: { type: 'relay' } });

        assert.equal(stub.errors.length, 1);
        assert.match(stub.errors[0].message, /unknown command "relay" for cloud API v2/);
    });

    it('clears the status on close and reports done', async () => {
        const stub = makeStubRed(SERVER);
        const ShellyCloudNode = makeCloudNode(stub.RED);
        new ShellyCloudNode({ server: 'server-id' });

        let closed = false;
        await stub.handlers.close(() => {
            closed = true;
        });

        assert.equal(closed, true);
        assert.deepEqual(stub.statuses[stub.statuses.length - 1], {});
    });
});
