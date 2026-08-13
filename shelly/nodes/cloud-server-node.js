module.exports = function (RED) {
    'use strict';

    const utils = require('../lib/utils.js');
    const { resolveApiVersion } = require('./cloud/api-version.js');

    function ShellyCloudServerNode(config) {
        RED.nodes.createNode(this, config);

        const node = this;

        node.serverUri = utils.trim(node.credentials.serveruri);
        node.authKey = utils.trim(node.credentials.authkey);

        // The API version belongs to the connection, not to each message, which keeps the two
        // payload vocabularies apart — `light` exists in both with different fields. An absent
        // value means the node predates this option, so it stays on v1. See ADR-011.
        node.apiVersion = resolveApiVersion(config.apiversion);

        this.getCredentials = function () {
            const credentials = {
                serverUri: node.serverUri,
                authKey: node.authKey,
            };

            return credentials;
        };
    }

    return ShellyCloudServerNode;
};
