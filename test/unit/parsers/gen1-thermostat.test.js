const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { inputParserThermostat1Async } = require('../../../shelly/nodes/gen1/parsers/thermostat.js');

describe('inputParserThermostat1Async', () => {
    it('returns undefined for an invalid msg', async () => {
        assert.equal(await inputParserThermostat1Async(undefined), undefined);
        assert.equal(await inputParserThermostat1Async({ payload: {} }), undefined);
    });

    it('emits position when in range 0..100', async () => {
        assert.equal(await inputParserThermostat1Async({ payload: { position: 50 } }), '/thermostat/0?pos=50');
        assert.equal(await inputParserThermostat1Async({ payload: { position: 0 } }), '/thermostat/0?pos=0');
        assert.equal(await inputParserThermostat1Async({ payload: { position: 100 } }), '/thermostat/0?pos=100');
    });

    it('skips position out of range', async () => {
        const r1 = await inputParserThermostat1Async({ payload: { position: -1 } });
        const r2 = await inputParserThermostat1Async({ payload: { position: 200 } });
        assert.equal(r1, undefined);
        assert.equal(r2, undefined);
    });

    it('emits target_t when temperature in range 4..31', async () => {
        assert.equal(
            await inputParserThermostat1Async({ payload: { temperature: 21 } }),
            '/thermostat/0?target_t=21',
        );
        assert.equal(
            await inputParserThermostat1Async({ payload: { temperature: 4 } }),
            '/thermostat/0?target_t=4',
        );
        assert.equal(
            await inputParserThermostat1Async({ payload: { temperature: 31 } }),
            '/thermostat/0?target_t=31',
        );
    });

    it('skips temperature out of range', async () => {
        const r1 = await inputParserThermostat1Async({ payload: { temperature: 3 } });
        const r2 = await inputParserThermostat1Async({ payload: { temperature: 32 } });
        assert.equal(r1, undefined);
        assert.equal(r2, undefined);
    });

    it('emits schedule for true and false', async () => {
        assert.equal(
            await inputParserThermostat1Async({ payload: { schedule: true } }),
            '/thermostat/0?schedule=true',
        );
        assert.equal(
            await inputParserThermostat1Async({ payload: { schedule: false } }),
            '/thermostat/0?schedule=false',
        );
    });

    it('emits scheduleProfile when in range 1..5', async () => {
        assert.equal(
            await inputParserThermostat1Async({ payload: { scheduleProfile: 1 } }),
            '/thermostat/0?schedule_profile=1',
        );
        assert.equal(
            await inputParserThermostat1Async({ payload: { scheduleProfile: 5 } }),
            '/thermostat/0?schedule_profile=5',
        );
    });

    it('skips scheduleProfile out of range', async () => {
        // This is the regression test for the bug fixed in 11.9.2 (was `||` so always true).
        assert.equal(
            await inputParserThermostat1Async({ payload: { scheduleProfile: 0 } }),
            undefined,
        );
        assert.equal(
            await inputParserThermostat1Async({ payload: { scheduleProfile: 6 } }),
            undefined,
        );
        assert.equal(
            await inputParserThermostat1Async({ payload: { scheduleProfile: -1 } }),
            undefined,
        );
        assert.equal(
            await inputParserThermostat1Async({ payload: { scheduleProfile: 100 } }),
            undefined,
        );
    });

    it('emits boostMinutes when >= 0', async () => {
        assert.equal(
            await inputParserThermostat1Async({ payload: { boostMinutes: 30 } }),
            '/thermostat/0?boost_minutes=30',
        );
        assert.equal(
            await inputParserThermostat1Async({ payload: { boostMinutes: 0 } }),
            '/thermostat/0?boost_minutes=0',
        );
    });

    it('skips boostMinutes when negative', async () => {
        assert.equal(
            await inputParserThermostat1Async({ payload: { boostMinutes: -1 } }),
            undefined,
        );
    });

    it('combines multiple parameters', async () => {
        assert.equal(
            await inputParserThermostat1Async({
                payload: { position: 30, temperature: 22, schedule: true, scheduleProfile: 2, boostMinutes: 45 },
            }),
            '/thermostat/0?pos=30&target_t=22&schedule=true&schedule_profile=2&boost_minutes=45',
        );
    });
});
