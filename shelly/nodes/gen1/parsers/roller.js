'use strict';

const utils = require('../../../lib/utils.js');

async function inputParserRoller1Async(msg) {
    let route;
    if (utils.isMsgPayloadValid(msg)) {
        let command = msg.payload;

        let roller = 0;
        if (command.roller !== undefined) {
            roller = command.roller;
        }

        let go;
        if (command.go !== undefined) {
            go = command.go;

            if (command.go == 'to_pos' && command.roller_pos !== undefined) {
                go += '&roller_pos=' + command.roller_pos;
            }
        }

        if (go !== undefined) {
            route = '/roller/' + roller + '?go=' + go;
        }

        // we fall back to relay mode if no valid roller command is received.
        if (route === undefined) {
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

            if (turn !== undefined) {
                route = '/relay/' + relay + '?turn=' + turn;
            }
        }
    }
    return route;
}

module.exports = { inputParserRoller1Async };
