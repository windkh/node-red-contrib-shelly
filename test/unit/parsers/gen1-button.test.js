const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { inputParserButton1Async } = require('../../../shelly/nodes/gen1/parsers/button.js');

describe('inputParserButton1Async', () => {
    it('returns undefined for an invalid msg', async () => {
        assert.equal(await inputParserButton1Async(undefined), undefined);
        assert.equal(await inputParserButton1Async({ payload: {} }), undefined);
    });

    it('emits S event when no event provided (default)', async () => {
        // The "S" default only emits a route when payload is non-empty.
        const r = await inputParserButton1Async({ payload: { input: 0 } });
        assert.equal(r, '/input/0?event=S');
    });

    it('emits the provided event', async () => {
        assert.equal(
            await inputParserButton1Async({ payload: { event: 'L' } }),
            '/input/0?event=L',
        );
        assert.equal(
            await inputParserButton1Async({ payload: { event: 'SS' } }),
            '/input/0?event=SS',
        );
        assert.equal(
            await inputParserButton1Async({ payload: { event: 'SSS' } }),
            '/input/0?event=SSS',
        );
    });

    it('selects the given input index', async () => {
        assert.equal(
            await inputParserButton1Async({ payload: { input: 2, event: 'S' } }),
            '/input/2?event=S',
        );
    });

    it('appends event_cnt when eventCount provided', async () => {
        assert.equal(
            await inputParserButton1Async({ payload: { event: 'S', eventCount: 3 } }),
            '/input/0?event=S&event_cnt=3',
        );
    });
});
