module.exports = function (RED) {
    'use strict';

    const utils = require('../lib/utils.js');

    function ShellyCloudServerNode(config) {
        RED.nodes.createNode(this, config);

        let node = this;

        node.serverUri = utils.trim(node.credentials.serveruri);
        node.authKey = utils.trim(node.credentials.authkey);

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
