const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { inputParserDimmer1Async } = require('../../../shelly/nodes/gen1/parsers/dimmer.js');

describe('inputParserDimmer1Async', () => {
    it('returns undefined for an invalid msg', async () => {
        assert.equal(await inputParserDimmer1Async(undefined), undefined);
        assert.equal(await inputParserDimmer1Async({ payload: {} }), undefined);
    });

    it('turn on', async () => {
        assert.equal(await inputParserDimmer1Async({ payload: { on: true } }), '/light/0?turn=on');
    });

    it('turn off', async () => {
        assert.equal(await inputParserDimmer1Async({ payload: { on: false } }), '/light/0?turn=off');
    });

    it('appends brightness in range', async () => {
        assert.equal(
            await inputParserDimmer1Async({ payload: { on: true, brightness: 50 } }),
            '/light/0?turn=on&brightness=50',
        );
    });

    it('clamps brightness out of range to 100', async () => {
        // Per the source: range is 1..100; out-of-range defaults to 100.
        assert.equal(
            await inputParserDimmer1Async({ payload: { on: true, brightness: 0 } }),
            '/light/0?turn=on&brightness=100',
        );
        assert.equal(
            await inputParserDimmer1Async({ payload: { on: true, brightness: 200 } }),
            '/light/0?turn=on&brightness=100',
        );
    });

    it('appends temp in valid range (2700..6500)', async () => {
        assert.equal(
            await inputParserDimmer1Async({ payload: { on: true, temp: 4000 } }),
            '/light/0?turn=on&temp=4000',
        );
    });

    it('skips temp out of range', async () => {
        // 2000 is below the 2700 floor — temp should not be emitted.
        const result = await inputParserDimmer1Async({ payload: { on: true, temp: 2000 } });
        assert.ok(!result.includes('temp='), `temp shouldn't be in: ${result}`);
    });

    it('appends transition in range', async () => {
        assert.equal(
            await inputParserDimmer1Async({ payload: { on: true, transition: 1000 } }),
            '/light/0?turn=on&transition=1000',
        );
    });

    it('skips transition out of range', async () => {
        const result = await inputParserDimmer1Async({ payload: { on: true, transition: 10000 } });
        assert.ok(!result.includes('transition='));
    });

    it('appends timer when >= 0', async () => {
        assert.equal(
            await inputParserDimmer1Async({ payload: { on: true, timer: 0 } }),
            '/light/0?turn=on&timer=0',
        );
        assert.equal(
            await inputParserDimmer1Async({ payload: { on: true, timer: 5 } }),
            '/light/0?turn=on&timer=5',
        );
    });

    it('skips timer when negative', async () => {
        const result = await inputParserDimmer1Async({ payload: { on: true, timer: -1 } });
        assert.ok(!result.includes('timer='));
    });

    it('appends dim and step', async () => {
        assert.equal(
            await inputParserDimmer1Async({ payload: { dim: 'up', step: 10 } }),
            '/light/0?step=10&dim=up',
        );
    });

    it('selects the given light index', async () => {
        assert.equal(
            await inputParserDimmer1Async({ payload: { light: 1, on: true } }),
            '/light/1?turn=on',
        );
    });

    it('builds the full bulb-duo style payload', async () => {
        assert.equal(
            await inputParserDimmer1Async({
                payload: { on: true, brightness: 80, white: 50, temp: 3000, transition: 200, timer: 60 },
            }),
            '/light/0?turn=on&brightness=80&white=50&temp=3000&transition=200&timer=60',
        );
    });

    it('returns undefined when no command flag is set at all', async () => {
        // Only relay index, no on/turn/brightness/etc. — no parameters to send.
        assert.equal(await inputParserDimmer1Async({ payload: { light: 0 } }), undefined);
    });
});
