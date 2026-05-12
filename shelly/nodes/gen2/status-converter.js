'use strict';

const utils = require('../../lib/utils.js');

// Filters a gen 2+ Shelly.GetStatus response: copies every key whose value
// is defined, stripping ':' from compound keys (e.g. "input:0" -> "input0")
// so downstream Node-RED expressions can use dot-notation.
function convertStatus2(status) {
    let result = {};

    Object.keys(status).forEach((key) => {
        let statusValue = status[key];
        if (statusValue !== undefined) {
            // we only copy the key that contain a : like input:0...
            let newKey;
            if (key.indexOf(':') !== -1) {
                newKey = utils.replace(key, ':', '');
                result[newKey] = statusValue;
            } else {
                newKey = key;
            }
            result[newKey] = statusValue;
        }
    });

    return result;
}

module.exports = { convertStatus2 };
