'use strict';

const utils = require('../../../lib/utils.js');

async function inputParserSensor1Async(msg) {
    let route;
    if (utils.isMsgPayloadValid(msg)) {
        // right now sensors do not accept input commands.
    }
    return route;
}

module.exports = { inputParserSensor1Async };
