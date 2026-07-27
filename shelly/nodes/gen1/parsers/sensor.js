'use strict';

// Sensors accept no input commands, so there is never a route to call. The parser exists to keep
// the per-device-type dispatch uniform; returning undefined makes executeCommand1 fall through to
// a plain status read. The message is accepted and ignored, hence the `_` prefix.
async function inputParserSensor1Async(_msg) {
    return undefined;
}

module.exports = { inputParserSensor1Async };
