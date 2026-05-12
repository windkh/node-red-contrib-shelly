const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { convertStatus1 } = require('../../../shelly/nodes/gen1/status-converter.js');

describe('convertStatus1', () => {
    it('returns an empty object for empty input', () => {
        assert.deepEqual(convertStatus1({}), {});
    });

    it('copies relays through', () => {
        const status = { relays: [{ ison: true, has_timer: false }] };
        assert.deepEqual(convertStatus1(status), { relays: [{ ison: true, has_timer: false }] });
    });

    it('copies rollers through', () => {
        const status = { rollers: [{ state: 'open', current_pos: 50 }] };
        assert.deepEqual(convertStatus1(status), { rollers: [{ state: 'open', current_pos: 50 }] });
    });

    it('copies lights through', () => {
        const status = { lights: [{ ison: true, brightness: 60 }] };
        assert.deepEqual(convertStatus1(status), { lights: [{ ison: true, brightness: 60 }] });
    });

    it('copies thermostats through', () => {
        const status = { thermostats: [{ target_t: 21, pos: 50 }] };
        assert.deepEqual(convertStatus1(status), { thermostats: [{ target_t: 21, pos: 50 }] });
    });

    it('copies meters through', () => {
        const status = { meters: [{ power: 123, is_valid: true }] };
        assert.deepEqual(convertStatus1(status), { meters: [{ power: 123, is_valid: true }] });
    });

    it('copies emeters through', () => {
        const status = { emeters: [{ power: 500, voltage: 230 }] };
        assert.deepEqual(convertStatus1(status), { emeters: [{ power: 500, voltage: 230 }] });
    });

    it('copies inputs and adcs through', () => {
        const status = { inputs: [{ input: 0 }], adcs: [{ voltage: 1.23 }] };
        assert.deepEqual(convertStatus1(status), { inputs: [{ input: 0 }], adcs: [{ voltage: 1.23 }] });
    });

    it('copies door / window sensor fields through (sensor, lux, bat)', () => {
        const status = {
            sensor: { state: 'open', is_valid: true },
            lux: { value: 150, illumination: 'twilight', is_valid: true },
            bat: { value: 95, voltage: 6.01 },
        };
        assert.deepEqual(convertStatus1(status), status);
    });

    it('copies H&T fields through (tmp, hum)', () => {
        const status = { tmp: { value: 21.5, units: 'C' }, hum: { value: 55.2 } };
        assert.deepEqual(convertStatus1(status), status);
    });

    it('copies smoke / flood / accel / concentration through', () => {
        const status = {
            smoke: false,
            flood: false,
            accel: { tilt: 0, vibration: 0 },
            concentration: { ppm: 0, is_valid: true },
        };
        assert.deepEqual(convertStatus1(status), status);
    });

    it('promotes ext_temperature into result.ext.temperature', () => {
        const status = { ext_temperature: { '0': { tC: 22.5, tF: 72.5 } } };
        const result = convertStatus1(status);
        assert.deepEqual(result, { ext: { temperature: { '0': { tC: 22.5, tF: 72.5 } } } });
    });

    it('promotes ext_humidity into result.ext.humidity', () => {
        const status = { ext_humidity: { '0': { hum: 55 } } };
        const result = convertStatus1(status);
        assert.deepEqual(result, { ext: { humidity: { '0': { hum: 55 } } } });
    });

    it('merges ext_temperature and ext_humidity under one result.ext', () => {
        const status = {
            ext_temperature: { '0': { tC: 22.5 } },
            ext_humidity: { '0': { hum: 55 } },
        };
        const result = convertStatus1(status);
        assert.deepEqual(result, {
            ext: {
                temperature: { '0': { tC: 22.5 } },
                humidity: { '0': { hum: 55 } },
            },
        });
    });

    it('skips ext_temperature when the value is an empty object', () => {
        // utils.isEmpty branch — empty objects shouldn't create result.ext.
        const status = { ext_temperature: {} };
        assert.deepEqual(convertStatus1(status), {});
    });

    it('skips ext_humidity when the value is an empty object', () => {
        assert.deepEqual(convertStatus1({ ext_humidity: {} }), {});
    });

    it('drops keys that are not in the recognised allowlist', () => {
        // unknown_field is not surfaced; only the recognised keys are.
        const status = { relays: [{ ison: true }], unknown_field: 'should be dropped' };
        assert.deepEqual(convertStatus1(status), { relays: [{ ison: true }] });
    });

    it('handles a realistic mixed-fields status snapshot', () => {
        const status = {
            relays: [{ ison: true, has_timer: false, source: 'http' }],
            meters: [{ power: 42, is_valid: true }],
            inputs: [{ input: 0 }],
            wifi_sta: { connected: true, ssid: 'home' }, // unrecognised, should drop
            uptime: 12345, // unrecognised, should drop
        };
        const result = convertStatus1(status);
        assert.deepEqual(result, {
            relays: [{ ison: true, has_timer: false, source: 'http' }],
            meters: [{ power: 42, is_valid: true }],
            inputs: [{ input: 0 }],
        });
    });
});
