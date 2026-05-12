'use strict';

const utils = require('../../../lib/utils.js');
const { combineUrl } = require('./util.js');

async function inputParserThermostat1Async(msg) {
    let route;
    if (utils.isMsgPayloadValid(msg)) {
        let command = msg.payload;

        let thermostat = 0;

        let position;
        if (command.position !== undefined) {
            if (command.position >= 0 && command.position <= 100) {
                position = command.position;
            } else {
                // Default is undefined
            }
        }

        let temperature;
        if (command.temperature !== undefined) {
            if (command.temperature >= 4 && command.temperature <= 31) {
                temperature = command.temperature;
            } else {
                // Default is undefined
            }
        }

        let schedule;
        if (command.schedule !== undefined) {
            if (command.schedule == true || command.schedule == false) {
                schedule = command.schedule;
            }
        }

        let scheduleProfile;
        if (command.scheduleProfile !== undefined) {
            if (command.scheduleProfile >= 1 && command.scheduleProfile <= 5) {
                scheduleProfile = command.scheduleProfile;
            }
        }

        let boostMinutes;
        if (command.boostMinutes !== undefined) {
            if (command.boostMinutes >= 0) {
                boostMinutes = command.boostMinutes;
            }
        }

        let parameters = '';
        if (position !== undefined) {
            parameters = '&pos=' + position;
        }

        if (temperature !== undefined) {
            parameters += '&target_t=' + temperature;
        }

        if (schedule !== undefined) {
            parameters += '&schedule=' + schedule;
        }

        if (scheduleProfile !== undefined) {
            parameters += '&schedule_profile=' + scheduleProfile;
        }

        if (boostMinutes !== undefined) {
            parameters += '&boost_minutes=' + boostMinutes;
        }

        if (parameters !== '') {
            route = combineUrl('/thermostat/' + thermostat, parameters);
        }
    }
    return route;
}

module.exports = { inputParserThermostat1Async };
