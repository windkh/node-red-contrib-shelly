module.exports = function (RED) {
    'use strict';

    const { handleInput } = require('./cloud/dispatch.js');

    // --------------------------------------------------------------------------------------------
    // The shelly node controls a shelly via cloud api.
    //
    // Runtime glue only: everything testable — request building, transport, dispatch — lives in
    // cloud/, which needs no RED object. See doc/architecture/adr/012.
    function ShellyCloudNode(config) {
        RED.nodes.createNode(this, config);
        const node = this;

        node.server = RED.nodes.getNode(config.server);

        node.status({});

        this.on('input', function (msg) {
            return handleInput(node, msg);
        });

        this.on('close', function (done) {
            node.status({});
            done();
        });
    }

    return ShellyCloudNode;
};
