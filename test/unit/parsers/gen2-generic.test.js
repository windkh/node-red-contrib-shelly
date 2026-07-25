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

    // #195: Shelly's own gen2 docs spell this field `params`. Payloads written that
    // way used to lose their arguments and the device answered HTTP 400
    // ({"error":{"code":-103,...}}), which read as "Request failed with status code 400".
    it("accepts 'params' as an alias for 'parameters'", () => {
        const result = inputParserGeneric2({
            method: 'Switch.Set',
            params: { id: 0, on: true },
        });
        assert.deepEqual(result.data, {
            id: 1,
            method: 'Switch.Set',
            params: { id: 0, on: true },
        });
    });

    it('accepts a full JSON-RPC frame copied from the Shelly docs', () => {
        const result = inputParserGeneric2({
            id: 1,
            method: 'Switch.Set',
            params: { id: 0, on: false },
        });
        assert.equal(result.route, '/rpc');
        assert.deepEqual(result.data.params, { id: 0, on: false });
    });

    it("prefers 'parameters' when both spellings are present", () => {
        const result = inputParserGeneric2({
            method: 'Switch.Set',
            parameters: { id: 0, on: true },
            params: { id: 1, on: false },
        });
        assert.deepEqual(result.data.params, { id: 0, on: true });
    });

    it("treats an explicitly undefined 'parameters' as absent and falls back to 'params'", () => {
        const result = inputParserGeneric2({
            method: 'Switch.Set',
            parameters: undefined,
            params: { id: 2, on: true },
        });
        assert.deepEqual(result.data.params, { id: 2, on: true });
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

    it("carries the 'params' alias through the array path too", () => {
        const result = inputParserGeneric2Array({
            payload: [
                { method: 'Switch.Set', params: { id: 0, on: true } },
                { method: 'Switch.Set', parameters: { id: 1, on: false } },
            ],
        });
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
