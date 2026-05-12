'use strict';

const utils = require('../../../lib/utils.js');
const { combineUrl } = require('./util.js');

async function inputParserDimmer1Async(msg) {
    let route;
    if (utils.isMsgPayloadValid(msg)) {
        let command = msg.payload;

        let light = 0;
        if (command.light !== undefined) {
            light = command.light;
        }

        let turn;
        if (command.on !== undefined) {
            if (command.on == true) {
                turn = 'on';
            } else {
                turn = 'off';
            }
        } else if (command.turn !== undefined) {
            turn = command.turn;
        } else {
            // turn is undefined
        }

        let brightness;
        if (command.brightness !== undefined) {
            if (command.brightness >= 1 && command.brightness <= 100) {
                brightness = command.brightness;
            } else {
                brightness = 100; // Default to full brightness
            }
        }

        let white;
        if (command.white !== undefined) {
            if (command.white >= 1 && command.white <= 100) {
                white = command.white;
            } else {
                // Default is undefined
            }
        }

        let temperature;
        if (command.temp !== undefined) {
            if (command.temp >= 2700 && command.temp <= 6500) {
                temperature = command.temp;
            } else {
                // Default is undefined
            }
        }

        let transition;
        if (command.transition !== undefined) {
            if (command.transition >= 0 && command.transition <= 5000) {
                transition = command.transition;
            } else {
                // Default is undefined
            }
        }

        let timer;
        if (command.timer !== undefined) {
            if (command.timer >= 0) {
                timer = command.timer;
            } else {
                // Default is undefined
            }
        }

        let dim;
        if (command.dim !== undefined) {
            dim = command.dim;
        }

        let step;
        if (command.step !== undefined) {
            step = command.step;
        }

        let parameters = '';
        if (turn !== undefined) {
            parameters += '&turn=' + turn;
        }

        if (brightness !== undefined) {
            parameters += '&brightness=' + brightness;
        }

        if (white !== undefined) {
            parameters += '&white=' + white;
        }

        if (temperature !== undefined) {
            parameters += '&temp=' + temperature;
        }

        if (transition !== undefined) {
            parameters += '&transition=' + transition;
        }

        if (timer !== undefined) {
            parameters += '&timer=' + timer;
        }

        if (step !== undefined) {
            parameters += '&step=' + step;
        }

        if (dim !== undefined) {
            parameters += '&dim=' + dim;
        }

        if (parameters !== '') {
            route = combineUrl('/light/' + light, parameters);
        }
    }
    return route;
}

module.exports = { inputParserDimmer1Async };
