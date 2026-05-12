'use strict';

const utils = require('../../../lib/utils.js');

// Converts a single gen 2+ command object into the JSON-RPC envelope shape
// the device's POST /rpc endpoint expects.
function inputParserGeneric2(command) {
    let method = 'POST';
    let data;
    let route;

    let rpcMethod;
    if (command.method !== undefined) {
        rpcMethod = command.method;
    }

    let parameters;
    if (command.parameters !== undefined) {
        parameters = command.parameters;
    }

    if (rpcMethod !== undefined) {
        route = '/rpc';
        data = {
            id: 1,
            method: rpcMethod,
            params: parameters,
        };
    }

    let request = {
        route: route,
        method: method,
        data: data,
    };

    return request;
}

// Accepts a single command or an array of commands on msg.payload and returns
// the requests for executeCommand2 to issue. An empty array means "no commands
// to issue" — executeCommand2 will then fall through to a plain GetStatus.
function inputParserGeneric2Array(msg) {
    let requests = [];

    if (utils.isMsgPayloadValidOrArray(msg)) {
        if (!Array.isArray(msg.payload)) {
            let request = inputParserGeneric2(msg.payload);
            requests.push(request);
        } else {
            msg.payload.forEach((payload) => {
                let request = inputParserGeneric2(payload);
                requests.push(request);
            });
        }
    }

    return requests;
}

module.exports = { inputParserGeneric2, inputParserGeneric2Array };
