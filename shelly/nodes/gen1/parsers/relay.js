'use strict';

const utils = require('../../../lib/utils.js');
const { combineUrl } = require('./util.js');

async function inputParserRelay1Async(msg) {
    let route;
    if (utils.isMsgPayloadValid(msg)) {
        let command = msg.payload;

        let relay = 0;
        if (command.relay !== undefined) {
            relay = command.relay;
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
        }

        let timerSeconds;
        if (command.timer !== undefined) {
            timerSeconds = command.timer;
        }

        let parameters = '';
        if (turn !== undefined) {
            parameters += '&turn=' + turn;
        }

        if (timerSeconds !== undefined) {
            parameters += '&timer=' + timerSeconds;
        }

        if (parameters !== '') {
            route = combineUrl('/relay/' + relay, parameters);
        }
    }
    return route;
}

module.exports = { inputParserRelay1Async };
