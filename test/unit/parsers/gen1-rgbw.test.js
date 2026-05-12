const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { inputParserRGBW1Async } = require('../../../shelly/nodes/gen1/parsers/rgbw.js');

const colorNode = { rgbwMode: 'color' };
const whiteNode = { rgbwMode: 'white' };
const otherNode = { rgbwMode: 'auto' };

describe('inputParserRGBW1Async (color mode)', () => {
    it('returns undefined for invalid msg', async () => {
        assert.equal(await inputParserRGBW1Async(undefined, colorNode), undefined);
        assert.equal(await inputParserRGBW1Async({ payload: {} }, colorNode), undefined);
    });

    it('defaults turn=on when no on/turn given but command is otherwise present', async () => {
        // The parser sets turn='on' by default in color mode when payload is non-empty.
        const r = await inputParserRGBW1Async({ payload: { red: 100 } }, colorNode);
        assert.ok(r.startsWith('/color/0?turn=on'));
        assert.ok(r.includes('red=100'));
    });

    it('translates on:false to turn=off', async () => {
        const r = await inputParserRGBW1Async({ payload: { on: false, red: 50 } }, colorNode);
        assert.ok(r.startsWith('/color/0?turn=off'));
    });

    it('emits RGB values in range', async () => {
        const r = await inputParserRGBW1Async(
            { payload: { red: 10, green: 20, blue: 30, white: 40 } },
            colorNode,
        );
        assert.ok(r.includes('red=10'));
        assert.ok(r.includes('green=20'));
        assert.ok(r.includes('blue=30'));
        assert.ok(r.includes('white=40'));
    });

    it('clamps out-of-range RGB to 255', async () => {
        // The source defaults to 255 when out of range.
        const r = await inputParserRGBW1Async({ payload: { red: 999 } }, colorNode);
        assert.ok(r.includes('red=255'));
    });

    it('appends gain in range', async () => {
        const r = await inputParserRGBW1Async({ payload: { gain: 50 } }, colorNode);
        assert.ok(r.includes('gain=50'));
    });

    it('clamps gain out of range to 100', async () => {
        const r = await inputParserRGBW1Async({ payload: { gain: 150 } }, colorNode);
        assert.ok(r.includes('gain=100'));
    });

    it('emits temp in range', async () => {
        const r = await inputParserRGBW1Async({ payload: { temp: 5000 } }, colorNode);
        assert.ok(r.includes('temp=5000'));
    });

    it('skips temp out of range', async () => {
        const r = await inputParserRGBW1Async({ payload: { temp: 2000 } }, colorNode);
        assert.ok(!r.includes('temp='));
    });

    it('skips timer at zero', async () => {
        // timer is only emitted when > 0.
        const r = await inputParserRGBW1Async({ payload: { on: true, timer: 0 } }, colorNode);
        assert.ok(!r.includes('timer='));
    });

    it('emits timer when > 0', async () => {
        const r = await inputParserRGBW1Async({ payload: { on: true, timer: 30 } }, colorNode);
        assert.ok(r.includes('timer=30'));
    });

    it('builds the full color payload', async () => {
        const r = await inputParserRGBW1Async(
            {
                payload: {
                    on: true,
                    red: 10,
                    green: 20,
                    blue: 30,
                    white: 0,
                    gain: 100,
                    brightness: 80,
                    effect: 0,
                    transition: 500,
                    timer: 60,
                },
            },
            colorNode,
        );
        assert.equal(
            r,
            '/color/0?turn=on&gain=100&red=10&green=20&blue=30&white=0&brightness=80&effect=0&transition=500&timer=60',
        );
    });
});

describe('inputParserRGBW1Async (white mode)', () => {
    it('builds the white-mode route', async () => {
        const r = await inputParserRGBW1Async({ payload: { on: true, brightness: 80 } }, whiteNode);
        assert.equal(r, '/white/0?turn=on&brightness=80');
    });

    it('selects the light index', async () => {
        const r = await inputParserRGBW1Async({ payload: { light: 2, on: true } }, whiteNode);
        assert.ok(r.startsWith('/white/2'));
    });

    it('emits temp when in range', async () => {
        const r = await inputParserRGBW1Async({ payload: { on: true, temp: 4500 } }, whiteNode);
        assert.ok(r.includes('temp=4500'));
    });

    it('builds the full white payload', async () => {
        const r = await inputParserRGBW1Async(
            { payload: { light: 0, on: true, brightness: 80, temp: 3500, transition: 200, timer: 30 } },
            whiteNode,
        );
        assert.equal(r, '/white/0?turn=on&brightness=80&temp=3500&transition=200&timer=30');
    });
});

describe('inputParserRGBW1Async (other / auto mode)', () => {
    it('returns undefined when node.rgbwMode is neither color nor white', async () => {
        // The "// node mode Auto or None" branch produces no route.
        const r = await inputParserRGBW1Async({ payload: { on: true, red: 100 } }, otherNode);
        assert.equal(r, undefined);
    });
});
