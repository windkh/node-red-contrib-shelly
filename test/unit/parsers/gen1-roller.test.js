const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { inputParserRoller1Async } = require('../../../shelly/nodes/gen1/parsers/roller.js');

describe('inputParserRoller1Async', () => {
    it('returns undefined for an invalid msg', async () => {
        assert.equal(await inputParserRoller1Async(undefined), undefined);
        assert.equal(await inputParserRoller1Async({ payload: {} }), undefined);
    });

    it('open command', async () => {
        assert.equal(await inputParserRoller1Async({ payload: { go: 'open' } }), '/roller/0?go=open');
    });

    it('close command', async () => {
        assert.equal(await inputParserRoller1Async({ payload: { go: 'close' } }), '/roller/0?go=close');
    });

    it('stop command', async () => {
        assert.equal(await inputParserRoller1Async({ payload: { go: 'stop' } }), '/roller/0?go=stop');
    });

    it('go to position appends roller_pos', async () => {
        assert.equal(
            await inputParserRoller1Async({ payload: { go: 'to_pos', roller_pos: 50 } }),
            '/roller/0?go=to_pos&roller_pos=50',
        );
    });

    it('selects the given roller index', async () => {
        assert.equal(await inputParserRoller1Async({ payload: { roller: 1, go: 'open' } }), '/roller/1?go=open');
    });

    it('falls back to relay mode when no go command provided', async () => {
        // When the device is in relay mode (not roller), passing on:true should produce a relay URL.
        assert.equal(await inputParserRoller1Async({ payload: { on: true } }), '/relay/0?turn=on');
    });

    it('relay fallback respects the relay index', async () => {
        assert.equal(await inputParserRoller1Async({ payload: { relay: 1, turn: 'off' } }), '/relay/1?turn=off');
    });

    it('go takes precedence over relay fallback', async () => {
        assert.equal(
            await inputParserRoller1Async({ payload: { go: 'open', on: true } }),
            '/roller/0?go=open',
        );
    });
});
