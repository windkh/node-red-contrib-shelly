const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { convertStatus2 } = require('../../../shelly/nodes/gen2/status-converter.js');

describe('convertStatus2', () => {
    it('returns an empty object for empty input', () => {
        assert.deepEqual(convertStatus2({}), {});
    });

    it('preserves keys without a colon', () => {
        const status = { wifi: { ssid: 'home', rssi: -55 }, sys: { uptime: 12345 } };
        assert.deepEqual(convertStatus2(status), {
            wifi: { ssid: 'home', rssi: -55 },
            sys: { uptime: 12345 },
        });
    });

    it('strips the colon from compound keys (input:0 -> input0)', () => {
        const status = { 'input:0': { id: 0, state: false } };
        const result = convertStatus2(status);
        assert.deepEqual(result, { input0: { id: 0, state: false } });
    });

    it('handles multiple component instances', () => {
        const status = {
            'switch:0': { id: 0, output: true, apower: 12.3 },
            'switch:1': { id: 1, output: false, apower: 0 },
            'input:0': { id: 0, state: true },
            'input:1': { id: 1, state: false },
        };
        const result = convertStatus2(status);
        assert.deepEqual(result, {
            switch0: { id: 0, output: true, apower: 12.3 },
            switch1: { id: 1, output: false, apower: 0 },
            input0: { id: 0, state: true },
            input1: { id: 1, state: false },
        });
    });

    it('does not surface keys whose value is undefined', () => {
        const status = { 'switch:0': { id: 0, output: true }, 'temperature:0': undefined };
        const result = convertStatus2(status);
        assert.deepEqual(result, { switch0: { id: 0, output: true } });
        assert.equal('temperature0' in result, false);
    });

    it('passes through a realistic Shelly.GetStatus payload shape', () => {
        const status = {
            'switch:0': { id: 0, source: 'init', output: true, apower: 9.5, voltage: 230 },
            'input:0': { id: 0, state: false },
            wifi: { sta_ip: '192.168.1.5', status: 'got ip', ssid: 'home', rssi: -52 },
            sys: { mac: 'AABBCCDDEEFF', uptime: 12345, ram_total: 247000 },
        };
        const result = convertStatus2(status);
        assert.equal(result.switch0.apower, 9.5);
        assert.equal(result.input0.state, false);
        assert.equal(result.wifi.ssid, 'home');
        assert.equal(result.sys.mac, 'AABBCCDDEEFF');
        // No leaked colon-bearing keys.
        Object.keys(result).forEach((k) => {
            assert.ok(!k.includes(':'), `result key "${k}" should not contain ":"`);
        });
    });

    it('preserves falsy-but-defined values like 0, false, empty string', () => {
        const status = { 'temperature:0': { id: 0, tC: 0 }, 'switch:0': { id: 0, output: false } };
        const result = convertStatus2(status);
        assert.equal(result.temperature0.tC, 0);
        assert.equal(result.switch0.output, false);
    });
});
