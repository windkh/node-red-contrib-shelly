'use strict';
let config = require('../config/config.json');

// Distinct filter.
function distinct(value, index, array) {
    return array.indexOf(value) === index;
}

// Gets all device type infos for the config editor
function getDeviceTypeInfos(gen) {
    let deviceTypeInfos = [];

    let keys = Object.keys(config.devices);
    for (let i = 0; i < keys.length; i++) {
        let device = config.devices[i];
        if (device.gen === gen) {
            let deviceTypeInfo = {
                deviceType: device.model,
                description: device.name + ' - (' + device.type + ' ' + device.model + ')',
            };

            deviceTypeInfos.push(deviceTypeInfo);
        }
    }

    return deviceTypeInfos;
}

// Gets the distinct models from the configuration.
function getDeviceModels(gen, type) {
    let foundModels = [];

    let keys = Object.keys(config.devices);
    for (let i = 0; i < keys.length; i++) {
        let device = config.devices[i];
        if (device.gen === gen) {
            if (device.type === type) {
                foundModels.push(device.model);
            }
        }
    }

    let models = foundModels.filter(distinct);
    return models;
}

// Gets the type from the model.
function getDeviceType(model) {
    let result;

    let keys = Object.keys(config.devices);
    for (let i = 0; i < keys.length; i++) {
        let device = config.devices[i];
        if (device.model === model) {
            result = device.type;
            break;
        }
    }

    return result;
}

function getDevice(model) {
    let result;

    let keys = Object.keys(config.devices);
    for (let i = 0; i < keys.length; i++) {
        let device = config.devices[i];
        if (device.model === model) {
            result = device;
            break;
        }
    }

    return result;
}

// see https://kb.shelly.cloud/knowledge-base/devices
let gen1DeviceTypes = new Map(config.gen1DeviceTypes);

function getDeviceTypes1(deviceType, exactMatch) {
    let deviceTypes;
    if (exactMatch === true) {
        deviceTypes = getDeviceModels('1', deviceType);
    } else {
        deviceTypes = gen1DeviceTypes.get(deviceType);
    }

    if (deviceTypes === undefined) {
        deviceTypes = [];
    }

    return deviceTypes;
}

function isExactTypeGen1(deviceType) {
    let result;

    switch (deviceType) {
        case 'Button':
        case 'Relay':
        case 'Measure':
        case 'Dimmer':
        case 'Roller':
        case 'Sensor':
        case 'Thermostat':
        case 'RGBW':
            result = false;
            break;
        default:
            result = true;
            break;
    }
    return result;
}

// see https://kb.shelly.cloud/knowledge-base/devices
// this list also contains the shelly gen3 and gen4 devices
let gen2DeviceTypes = new Map(config.gen2DeviceTypes);

function getDeviceTypes2(deviceType, exactMatch) {
    let deviceTypes = [];
    if (exactMatch === true) {
        let deviceTypes2 = getDeviceModels('2', deviceType);
        let deviceTypes3 = getDeviceModels('3', deviceType);
        let deviceTypes4 = getDeviceModels('4', deviceType);
        deviceTypes = deviceTypes2;
        deviceTypes = deviceTypes.concat(deviceTypes3);
        deviceTypes = deviceTypes.concat(deviceTypes4);
    } else {
        deviceTypes = gen2DeviceTypes.get(deviceType);
    }

    if (deviceTypes === undefined) {
        deviceTypes = [];
    }

    return deviceTypes;
}

function isExactTypeGen2(deviceType) {
    let result;

    switch (deviceType) {
        case 'Button':
        case 'Relay':
        case 'Measure':
        case 'Dimmer':
        case 'BluGateway':
        case 'Roller':
        case 'Sensor':
        case 'RGBW':
        case 'Thermostat':
            result = false;
            break;
        default:
            result = true;
            break;
    }
    return result;
}

module.exports = {
    getDeviceTypeInfos,
    // getDeviceModels,
    getDevice,
    getDeviceType,
    getDeviceTypes1,
    isExactTypeGen1,
    getDeviceTypes2,
    isExactTypeGen2,
};
