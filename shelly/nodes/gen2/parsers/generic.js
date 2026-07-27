'use strict';

const utils = require('../../../lib/utils.js');

// Converts a single gen 2+ command object into the JSON-RPC envelope shape
// the device's POST /rpc endpoint expects.
function inputParserGeneric2(command) {
    const method = 'POST';
    let data;
    let route;

    let rpcMethod;
    if (command.method !== undefined) {
        rpcMethod = command.method;
    }

    // `parameters` is this node's documented spelling, but Shelly's own gen2 RPC
    // docs (linked from the README) call the field `params`, so users routinely
    // write that instead. It used to be dropped silently, and the device then
    // rejected the argument-less call with HTTP 400 — see #195. Accept both.
    let parameters;
    if (command.parameters !== undefined) {
        parameters = command.parameters;
    } else if (command.params !== undefined) {
        parameters = command.params;
    }

    if (rpcMethod !== undefined) {
        route = '/rpc';
        data = {
            id: 1,
            method: rpcMethod,
            params: parameters,
        };
    }

    const request = {
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
    const requests = [];

    if (utils.isMsgPayloadValidOrArray(msg)) {
        if (!Array.isArray(msg.payload)) {
            const request = inputParserGeneric2(msg.payload);
            requests.push(request);
        } else {
            msg.payload.forEach((payload) => {
                const request = inputParserGeneric2(payload);
                requests.push(request);
            });
        }
    }

    return requests;
}

module.exports = { inputParserGeneric2, inputParserGeneric2Array };
