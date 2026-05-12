'use strict';

const utils = require('../../lib/utils.js');

// Filters a gen 1 device's /status response down to the interesting fields
// that the node surfaces on msg.payload. The full status remains available
// on msg.status when getStatusOnCommand is enabled.
function convertStatus1(status) {
    let result = {};

    if (status.relays !== undefined) {
        result.relays = status.relays;
    }

    if (status.rollers !== undefined) {
        result.rollers = status.rollers;
    }

    if (status.lights !== undefined) {
        result.lights = status.lights;
    }

    if (status.thermostats !== undefined) {
        result.thermostats = status.thermostats;
    }

    if (status.meters !== undefined) {
        result.meters = status.meters;
    }

    if (status.emeters !== undefined) {
        result.emeters = status.emeters;
    }

    if (status.inputs !== undefined) {
        result.inputs = status.inputs;
    }

    if (status.adcs !== undefined) {
        result.adcs = status.adcs;
    }

    if (status.sensor !== undefined) {
        result.sensor = status.sensor;
    }

    if (status.lux !== undefined) {
        result.lux = status.lux;
    }

    if (status.bat !== undefined) {
        result.bat = status.bat;
    }

    if (status.tmp !== undefined) {
        result.tmp = status.tmp;
    }

    if (status.hum !== undefined) {
        result.hum = status.hum;
    }

    if (status.smoke !== undefined) {
        result.smoke = status.smoke;
    }

    if (status.flood !== undefined) {
        result.flood = status.flood;
    }

    if (status.accel !== undefined) {
        result.accel = status.accel;
    }

    if (status.concentration !== undefined) {
        result.concentration = status.concentration;
    }

    if (status.ext_temperature !== undefined && !utils.isEmpty(status.ext_temperature)) {
        if (result.ext === undefined) {
            result.ext = {};
        }
        result.ext.temperature = status.ext_temperature;
    }

    if (status.ext_humidity !== undefined && !utils.isEmpty(status.ext_humidity)) {
        if (result.ext === undefined) {
            result.ext = {};
        }
        result.ext.humidity = status.ext_humidity;
    }

    return result;
}

module.exports = { convertStatus1 };
