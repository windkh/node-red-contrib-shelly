'use strict';

const utils = require('../../../lib/utils.js');
const { combineUrl } = require('./util.js');

async function inputParserButton1Async(msg) {
    let route;
    if (utils.isMsgPayloadValid(msg)) {
        let command = msg.payload;

        let input = 0;
        if (command.input !== undefined) {
            input = command.input;
        }

        let event = 'S';
        if (command.event !== undefined) {
            event = command.event;
        }

        let eventCount;
        if (command.eventCount !== undefined) {
            eventCount = command.eventCount;
        }

        let parameters = '';
        if (event !== undefined) {
            parameters = '&event=' + event;
        }

        if (eventCount !== undefined) {
            parameters += '&event_cnt=' + eventCount;
        }

        if (parameters !== '') {
            route = combineUrl('/input/' + input, parameters);
        }
    }
    return route;
}

module.exports = { inputParserButton1Async };
