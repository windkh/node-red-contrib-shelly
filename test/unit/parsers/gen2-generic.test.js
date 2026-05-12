const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { inputParserGeneric2, inputParserGeneric2Array } = require('../../../shelly/nodes/gen2/parsers/generic.js');

describe('inputParserGeneric2', () => {
    it('wraps the command into a JSON-RPC envelope', () => {
        const result = inputParserGeneric2({
            method: 'Switch.Set',
            parameters: { id: 0, on: true },
        });
        assert.equal(result.method, 'POST');
        assert.equal(result.route, '/rpc'); // post-11.10.1 — no trailing slash
        assert.deepEqual(result.data, {
            id: 1,
            method: 'Switch.Set',
            params: { id: 0, on: true },
        });
    });

    it('preserves the parameters as-is when present', () => {
        const result = inputParserGeneric2({
            method: 'Light.Set',
            parameters: { id: 0, on: true, brightness: 80, transition_duration: 1 },
        });
        assert.deepEqual(result.data.params, { id: 0, on: true, brightness: 80, transition_duration: 1 });
    });

    it('handles a method without parameters', () => {
        const result = inputParserGeneric2({ method: 'Shelly.GetStatus' });
        assert.equal(result.data.method, 'Shelly.GetStatus');
        assert.equal(result.data.params, undefined);
    });

    it('returns an envelope with undefined route/data when method is missing', () => {
        const result = inputParserGeneric2({});
        assert.equal(result.route, undefined);
        assert.equal(result.data, undefined);
        // The method ("POST") is always returned even with no rpc method —
        // the caller checks `request.route` to decide whether to issue.
        assert.equal(result.method, 'POST');
    });

    it('returns no route when only parameters are provided (no method)', () => {
        const result = inputParserGeneric2({ parameters: { id: 0 } });
        assert.equal(result.route, undefined);
    });
});

describe('inputParserGeneric2Array', () => {
    it('returns an empty array for invalid msg', () => {
        assert.deepEqual(inputParserGeneric2Array(undefined), []);
        assert.deepEqual(inputParserGeneric2Array({}), []);
        assert.deepEqual(inputParserGeneric2Array({ payload: {} }), []);
    });

    it('wraps a single command object as a single-element array', () => {
        const result = inputParserGeneric2Array({
            payload: { method: 'Switch.Toggle', parameters: { id: 0 } },
        });
        assert.equal(result.length, 1);
        assert.equal(result[0].route, '/rpc');
        assert.equal(result[0].data.method, 'Switch.Toggle');
    });

    it('handles an array payload (batched calls)', () => {
        const result = inputParserGeneric2Array({
            payload: [
                { method: 'Switch.Set', parameters: { id: 0, on: true } },
                { method: 'Switch.Set', parameters: { id: 1, on: false } },
            ],
        });
        assert.equal(result.length, 2);
        assert.deepEqual(result[0].data.params, { id: 0, on: true });
        assert.deepEqual(result[1].data.params, { id: 1, on: false });
    });

    it('returns an array of single-element envelopes for an array of 1', () => {
        const result = inputParserGeneric2Array({
            payload: [{ method: 'Shelly.GetStatus' }],
        });
        assert.equal(result.length, 1);
        assert.equal(result[0].data.method, 'Shelly.GetStatus');
    });
});
