const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { inputParserSensor1Async } = require('../../../shelly/nodes/gen1/parsers/sensor.js');

describe('inputParserSensor1Async', () => {
    it('always returns undefined — sensors are read-only', async () => {
        assert.equal(await inputParserSensor1Async(undefined), undefined);
        assert.equal(await inputParserSensor1Async({}), undefined);
        assert.equal(await inputParserSensor1Async({ payload: { anything: 'goes' } }), undefined);
    });
});
