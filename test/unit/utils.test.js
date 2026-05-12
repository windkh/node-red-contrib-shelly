const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const utils = require('../../shelly/lib/utils.js');

describe('utils.isMsgPayloadValid', () => {
    it('rejects undefined msg', () => {
        assert.equal(utils.isMsgPayloadValid(undefined), false);
    });

    it('rejects msg without payload', () => {
        assert.equal(utils.isMsgPayloadValid({}), false);
    });

    it('rejects array as msg', () => {
        assert.equal(utils.isMsgPayloadValid([{ payload: { a: 1 } }]), false);
    });

    it('rejects empty payload object', () => {
        assert.equal(utils.isMsgPayloadValid({ payload: {} }), false);
    });

    it('rejects array payload', () => {
        assert.equal(utils.isMsgPayloadValid({ payload: [1, 2] }), false);
    });

    it('accepts non-empty object payload', () => {
        assert.equal(utils.isMsgPayloadValid({ payload: { relay: 0, on: true } }), true);
    });

    it('accepts payload with a single key', () => {
        assert.equal(utils.isMsgPayloadValid({ payload: { hostname: '192.168.1.5' } }), true);
    });
});

describe('utils.isMsgPayloadValidOrArray', () => {
    it('rejects undefined msg', () => {
        assert.equal(utils.isMsgPayloadValidOrArray(undefined), false);
    });

    it('rejects msg without payload', () => {
        assert.equal(utils.isMsgPayloadValidOrArray({}), false);
    });

    it('rejects array as msg', () => {
        assert.equal(utils.isMsgPayloadValidOrArray([{ payload: { a: 1 } }]), false);
    });

    it('rejects empty object payload', () => {
        assert.equal(utils.isMsgPayloadValidOrArray({ payload: {} }), false);
    });

    it('accepts non-empty object payload', () => {
        assert.equal(utils.isMsgPayloadValidOrArray({ payload: { relay: 0 } }), true);
    });

    it('accepts non-empty array payload (this is the difference vs isMsgPayloadValid)', () => {
        assert.equal(utils.isMsgPayloadValidOrArray({ payload: [{ method: 'Switch.Set' }] }), true);
    });
});

describe('utils.isEmpty', () => {
    it('returns true for empty object', () => {
        assert.equal(utils.isEmpty({}), true);
    });

    it('returns false for object with keys', () => {
        assert.equal(utils.isEmpty({ a: 1 }), false);
    });

    it('returns false for object whose value is undefined (keys still count)', () => {
        assert.equal(utils.isEmpty({ a: undefined }), false);
    });
});

describe('utils.trim', () => {
    it('returns undefined for undefined input', () => {
        assert.equal(utils.trim(undefined), undefined);
    });

    it('returns undefined for empty string', () => {
        assert.equal(utils.trim(''), undefined);
    });

    it('strips leading and trailing whitespace', () => {
        assert.equal(utils.trim('  hello  '), 'hello');
    });

    it('leaves an already-trimmed string unchanged', () => {
        assert.equal(utils.trim('hello'), 'hello');
    });

    it('preserves internal whitespace', () => {
        assert.equal(utils.trim('  hello world  '), 'hello world');
    });
});

describe('utils.replace', () => {
    it('returns undefined for falsy input', () => {
        assert.equal(utils.replace(undefined, /x/g, 'y'), undefined);
        assert.equal(utils.replace('', /x/g, 'y'), undefined);
        assert.equal(utils.replace(null, /x/g, 'y'), undefined);
    });

    it('does global regex replace (used to strip quotes from digest realm/nonce)', () => {
        assert.equal(utils.replace('a"b"c', /"/g, ''), 'abc');
    });

    it('does string-literal replace (used for callback script %URL% / %SENDER% substitution)', () => {
        assert.equal(utils.replace('hello %URL% world', '%URL%', 'http://x'), 'hello http://x world');
    });

    it('returns the original when the pattern does not match', () => {
        assert.equal(utils.replace('hello', /world/g, 'x'), 'hello');
    });
});
