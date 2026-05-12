const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { inputParserRelay1Async } = require('../../../shelly/nodes/gen1/parsers/relay.js');

describe('inputParserRelay1Async', () => {
    it('returns undefined for an invalid msg', async () => {
        assert.equal(await inputParserRelay1Async(undefined), undefined);
        assert.equal(await inputParserRelay1Async({}), undefined);
        assert.equal(await inputParserRelay1Async({ payload: {} }), undefined);
    });

    it('returns undefined when payload has only a relay index (no command)', async () => {
        // No turn / on / timer — nothing to send.
        assert.equal(await inputParserRelay1Async({ payload: { relay: 0 } }), undefined);
    });

    it('translates `on: true` to turn=on', async () => {
        assert.equal(await inputParserRelay1Async({ payload: { on: true } }), '/relay/0?turn=on');
    });

    it('translates `on: false` to turn=off', async () => {
        assert.equal(await inputParserRelay1Async({ payload: { on: false } }), '/relay/0?turn=off');
    });

    it('uses `turn` directly when provided ("toggle", etc.)', async () => {
        assert.equal(await inputParserRelay1Async({ payload: { turn: 'toggle' } }), '/relay/0?turn=toggle');
    });

    it('appends timer parameter', async () => {
        assert.equal(await inputParserRelay1Async({ payload: { on: true, timer: 5 } }), '/relay/0?turn=on&timer=5');
    });

    it('selects the given relay index', async () => {
        assert.equal(await inputParserRelay1Async({ payload: { relay: 2, on: true } }), '/relay/2?turn=on');
    });

    it('on takes precedence over turn when both supplied', async () => {
        // `on` is checked first in the source, so it wins.
        assert.equal(await inputParserRelay1Async({ payload: { on: true, turn: 'off' } }), '/relay/0?turn=on');
    });

    it('returns undefined when only a relay index is given without turn/on', async () => {
        assert.equal(await inputParserRelay1Async({ payload: { relay: 1 } }), undefined);
    });
});
