const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { combineUrl } = require('../../../shelly/nodes/gen1/parsers/util.js');

describe('combineUrl', () => {
    it('joins path and parameters with ?', () => {
        assert.equal(combineUrl('/relay/0', 'turn=on&timer=5'), '/relay/0?turn=on&timer=5');
    });

    it('strips a leading & from parameters', () => {
        assert.equal(combineUrl('/relay/0', '&turn=on'), '/relay/0?turn=on');
    });

    it('handles a single parameter', () => {
        assert.equal(combineUrl('/light/0', '&brightness=50'), '/light/0?brightness=50');
    });

    it('handles a path with multiple segments', () => {
        assert.equal(combineUrl('/thermostat/0', '&pos=50&schedule=true'), '/thermostat/0?pos=50&schedule=true');
    });
});
