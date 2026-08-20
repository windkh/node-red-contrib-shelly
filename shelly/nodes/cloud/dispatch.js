'use strict';

const utils = require('../../lib/utils.js');

const { buildRequestV1 } = require('./parsers/v1.js');
const { buildRequestV2 } = require('./parsers/v2.js');
const { V2 } = require('./api-version.js');
const { shellyCloudRequestAsync, shellyCloudRequestV2Async } = require('./transport.js');

// Handles one input message for a cloud node. Takes the node rather than living inside the
// RED closure so it can be driven by a plain node stand-in — everything it touches is the
// node's own surface (server, status, send, error), never RED itself.
async function handleInput(node, msg) {
    try {
        const apiVersion = node.server.apiVersion;
        const hasPayload = utils.isMsgPayloadValid(msg);

        let request;
        if (hasPayload) {
            if (apiVersion === V2) {
                request = buildRequestV2(msg.payload);
            } else {
                request = buildRequestV1(msg.payload);
            }
        }

        if (request) {
            const credentials = node.server.getCredentials();

            let body;
            if (apiVersion === V2) {
                body = await shellyCloudRequestV2Async(request.route, request.body, credentials);
            } else {
                body = await shellyCloudRequestAsync('POST', request.route, request.params, credentials);
            }

            node.status({ fill: 'green', shape: 'ring', text: 'OK' });

            msg.payload = body;
            node.send([msg]);
        } else {
            // Doing nothing silently is what made an unusable command impossible to
            // diagnose: no error, no status change, no request. Name the command and
            // the configured API version, because the commonest cause is a v1 payload
            // reaching a v2 connection or the other way round.
            const command = hasPayload ? msg.payload.type : undefined;
            const reason = command === undefined ? 'no command in msg.payload' : 'unknown command "' + command + '"';
            const text = reason + ' for cloud API ' + apiVersion;

            node.status({ fill: 'red', shape: 'ring', text: text });
            node.error(text, msg);
        }
    } catch (error) {
        node.status({ fill: 'red', shape: 'ring', text: error.message });
        node.error('Failed to get status: ' + error.message);
    }
}

module.exports = { handleInput };
