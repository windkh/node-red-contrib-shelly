const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const configuration = require('../../shelly/lib/configuration.js');

// These tests exercise the catalog against real config.json data.
// Models referenced here (SHSW-1, SNSW-001X16EU, S3SW-001X16EU, S4SW-001X16EU)
// are foundational devices unlikely to be removed from the catalog.

describe('configuration.getDevice', () => {
    it('returns the device entry for a known gen 1 model', () => {
        const device = configuration.getDevice('SHSW-1');
        assert.ok(device, 'expected entry for SHSW-1');
        assert.equal(device.gen, '1');
        assert.equal(device.type, 'Relay');
        assert.equal(device.name, 'Shelly 1');
    });

    it('returns the device entry for a known gen 2 model', () => {
        const device = configuration.getDevice('SNSW-001X16EU');
        assert.ok(device, 'expected entry for SNSW-001X16EU');
        assert.equal(device.gen, '2');
        assert.equal(device.type, 'Relay');
    });

    it('returns undefined for an unknown model', () => {
        assert.equal(configuration.getDevice('NOT-A-MODEL'), undefined);
    });
});

describe('configuration.getDeviceType', () => {
    it('returns the type for a known gen 1 model', () => {
        assert.equal(configuration.getDeviceType('SHSW-1'), 'Relay');
    });

    it('returns the type for a known gen 2 model', () => {
        assert.equal(configuration.getDeviceType('SNSW-001X16EU'), 'Relay');
    });

    it('returns the type for a known gen 3 model', () => {
        assert.equal(configuration.getDeviceType('S3SW-001X16EU'), 'Relay');
    });

    it('returns the type for a known gen 4 model', () => {
        assert.equal(configuration.getDeviceType('S4SW-001X16EU'), 'Relay');
    });

    it('returns undefined for an unknown model', () => {
        assert.equal(configuration.getDeviceType('NOT-A-MODEL'), undefined);
    });
});

describe('configuration.getDeviceTypeInfos', () => {
    it('returns gen 1 entries when asked for gen 1', () => {
        const infos = configuration.getDeviceTypeInfos('1');
        assert.ok(infos.length > 0);
        assert.ok(infos.some((i) => i.deviceType === 'SHSW-1'));
        // shape contract
        infos.forEach((info) => {
            assert.equal(typeof info.deviceType, 'string');
            assert.equal(typeof info.description, 'string');
        });
    });

    it('returns gen 2 entries when asked for gen 2', () => {
        const infos = configuration.getDeviceTypeInfos('2');
        assert.ok(infos.length > 0);
        assert.ok(infos.some((i) => i.deviceType === 'SNSW-001X16EU'));
    });

    it('does not mix generations in a single call', () => {
        const gen1 = configuration.getDeviceTypeInfos('1');
        const gen2 = configuration.getDeviceTypeInfos('2');
        const gen1Models = new Set(gen1.map((i) => i.deviceType));
        const gen2Models = new Set(gen2.map((i) => i.deviceType));
        // Intersection should be empty — no model belongs to both generations.
        for (const m of gen1Models) {
            assert.equal(gen2Models.has(m), false, `model ${m} appears in both gen 1 and gen 2`);
        }
    });

    it('returns empty for an unknown generation', () => {
        assert.deepEqual(configuration.getDeviceTypeInfos('99'), []);
    });
});

describe('configuration.isExactTypeGen1', () => {
    it('returns false for known device families', () => {
        ['Relay', 'Measure', 'Dimmer', 'Roller', 'Sensor', 'Button', 'Thermostat', 'RGBW'].forEach((family) => {
            assert.equal(configuration.isExactTypeGen1(family), false, `expected ${family} to be a family not an exact model`);
        });
    });

    it('returns true for a concrete model name', () => {
        assert.equal(configuration.isExactTypeGen1('SHSW-1'), true);
        assert.equal(configuration.isExactTypeGen1('SHPLG-S'), true);
    });
});

describe('configuration.isExactTypeGen2', () => {
    it('returns false for known device families (including BluGateway)', () => {
        ['Relay', 'Measure', 'Dimmer', 'Roller', 'Sensor', 'Button', 'Thermostat', 'RGBW', 'BluGateway'].forEach((family) => {
            assert.equal(configuration.isExactTypeGen2(family), false, `expected ${family} to be a family not an exact model`);
        });
    });

    it('returns true for a concrete model name', () => {
        assert.equal(configuration.isExactTypeGen2('SNSW-001X16EU'), true);
        assert.equal(configuration.isExactTypeGen2('SPSW-003XE16EU'), true);
    });
});

describe('configuration.getDeviceTypes1', () => {
    it('returns the model-prefix list for a known family (exactMatch=false)', () => {
        const prefixes = configuration.getDeviceTypes1('Relay', false);
        assert.ok(Array.isArray(prefixes));
        assert.ok(prefixes.length > 0);
        assert.ok(prefixes.includes('SHSW-'), 'expected SHSW- in gen 1 Relay prefixes');
    });

    it('returns concrete model list when exactMatch=true', () => {
        const models = configuration.getDeviceTypes1('Relay', true);
        assert.ok(models.length > 0);
        assert.ok(models.includes('SHSW-1'), 'expected SHSW-1 in gen 1 Relay models');
        assert.ok(models.includes('SHPLG-S'), 'expected SHPLG-S in gen 1 Relay models');
    });

    it('returns empty array for unknown family', () => {
        assert.deepEqual(configuration.getDeviceTypes1('NotAFamily', false), []);
    });
});

describe('configuration.getDeviceTypes2', () => {
    it('returns the model-prefix list for a known family (exactMatch=false)', () => {
        const prefixes = configuration.getDeviceTypes2('Relay', false);
        assert.ok(Array.isArray(prefixes));
        assert.ok(prefixes.length > 0);
        assert.ok(prefixes.includes('SNSW-'), 'expected SNSW- in gen 2+ Relay prefixes');
    });

    it('returns concrete models across gen 2, 3, and 4 when exactMatch=true', () => {
        const models = configuration.getDeviceTypes2('Relay', true);
        assert.ok(models.includes('SNSW-001X16EU'), 'expected gen 2 model');
        assert.ok(models.includes('S3SW-001X16EU'), 'expected gen 3 model');
        assert.ok(models.includes('S4SW-001X16EU'), 'expected gen 4 model');
    });

    it('Shelly 2 Roller (SHSW-21 in roller mode) is typed as Roller, not Relay', () => {
        // Regression test for 11.10.3 — the catalog used to disagree with
        // itself: the SHSW-21 Roller entry was typed Relay while the
        // SHSW-21 prefix was already mapped to the Roller family.
        const device = configuration.getDevice('SHSW-21');
        assert.ok(device);
        // The first match is the "Shelly 2 Relay" entry (a relay), so
        // searching by model alone returns that. Searching the Roller
        // family for SHSW-21 should still find the prefix.
        const rollerModels = configuration.getDeviceTypes1('Roller', false);
        assert.ok(rollerModels.includes('SHSW-21'), 'SHSW-21 should be in the Roller prefix list');
    });

    it('lists the gen 4 sensors including the Presence Gen4 (S4SN-0U61X, #253)', () => {
        const sensors = configuration.getDeviceTypes2('Sensor', true);
        assert.ok(sensors.includes('S4SN-0U61X'), 'expected S4SN-0U61X (Presence Gen4) in Sensor models');
        assert.equal(configuration.getDeviceType('S4SN-0U61X'), 'Sensor');
        const device = configuration.getDevice('S4SN-0U61X');
        assert.equal(device.gen, '4');
        assert.equal(device.name, 'Shelly Presence Gen4');
    });

    it('returns the BluGateway prefixes', () => {
        const prefixes = configuration.getDeviceTypes2('BluGateway', false);
        assert.ok(prefixes.includes('SNGW-'), 'expected SNGW- in BluGateway prefixes');
        assert.ok(prefixes.includes('S3GW-'), 'expected S3GW- in BluGateway prefixes');
    });

    it('returns the RGBW prefixes for gen 2/3/4 family selection (regression for 11.11.2)', () => {
        // Pre-11.11.2 this returned []. Family-level RGBW selection was
        // therefore broken for SNDC-/SPDC-/S3BL-C devices.
        const prefixes = configuration.getDeviceTypes2('RGBW', false);
        assert.ok(prefixes.includes('SNDC-'), 'expected SNDC- (Plus RGBW PM) in RGBW prefixes');
        assert.ok(prefixes.includes('SPDC-'), 'expected SPDC- (Pro RGBWW PM) in RGBW prefixes');
        assert.ok(prefixes.includes('S3BL-C'), 'expected S3BL-C (Multicolor Bulb E27 Gen3) in RGBW prefixes');
    });

    it('the S3BL-C RGBW prefix is narrow enough to exclude the S3BL-D Duo Bulb (a Dimmer)', () => {
        // The Duo Bulb shares the S3BL- SKU root but is a tunable-white
        // Dimmer, not an RGBW. The longer prefix S3BL-C is what makes the
        // family lookup discriminate.
        const rgbwPrefixes = configuration.getDeviceTypes2('RGBW', false);
        const duoModel = 'S3BL-D010009AEU';
        const multiModel = 'S3BL-C010007AEU';
        const duoMatches = rgbwPrefixes.some((p) => duoModel.startsWith(p));
        const multiMatches = rgbwPrefixes.some((p) => multiModel.startsWith(p));
        assert.equal(duoMatches, false, 'Duo Bulb (S3BL-D...) must NOT match the RGBW prefix list');
        assert.equal(multiMatches, true, 'Multicolor Bulb (S3BL-C...) must match the RGBW prefix list');
    });

    it('returns empty array for unknown family', () => {
        assert.deepEqual(configuration.getDeviceTypes2('NotAFamily', false), []);
    });
});
