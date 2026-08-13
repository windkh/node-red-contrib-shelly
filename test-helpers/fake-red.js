'use strict';

// A minimal Node-RED runtime stand-in, enough to instantiate a node module and drive its
// input handler. The package does not load node-red in its tests, so this is how the cloud
// node's transport gets exercised end to end against a mocked HTTP server.
function makeFakeRed(serverNode) {
    const statuses = [];
    const errors = [];
    const sends = [];
    const warnings = [];

    let inputHandler;

    const RED = {
        nodes: {
            createNode: function (node) {
                node.status = (s) => statuses.push(s);
                node.error = (m, msg) => errors.push({ message: m, msg: msg });
                node.warn = (m) => warnings.push(m);
                node.send = (m) => sends.push(m);
                node.on = function (event, handler) {
                    if (event === 'input') {
                        inputHandler = handler;
                    }
                };
            },
            getNode: function () {
                return serverNode;
            },
        },
    };

    return {
        RED: RED,
        statuses: statuses,
        errors: errors,
        sends: sends,
        warnings: warnings,
        // Feeds a message through the node's input handler and resolves when it settles.
        send: function (msg) {
            return inputHandler(msg);
        },
    };
}

// The cloud server config node as the cloud node sees it.
function makeFakeCloudServer(options) {
    return {
        apiVersion: options.apiVersion,
        getCredentials: function () {
            return {
                serverUri: options.serverUri,
                authKey: options.authKey,
            };
        },
    };
}

module.exports = { makeFakeRed, makeFakeCloudServer };
