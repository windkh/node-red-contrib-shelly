module.exports = function (RED) {
    'use strict';

    const fastify = require('fastify');

    const utils = require('../lib/utils.js');

    function ShellyGen1ServerNode(config) {
        RED.nodes.createNode(this, config);

        const node = this;
        this.port = parseInt(config.port);
        // Both end up in the callback URL that the device is told to call back on, so
        // whitespace or a pasted scheme here breaks the webhook rather than the request
        // to the device. hostip is either a detected address or the literal 'hostname'.
        this.hostname = utils.trimHostname(config.hostname);
        this.hostip = utils.trim(config.hostip);
        this.server = fastify({
            logger: false, // set to true when debugging.
        });

        if (node.port > 0 && node.port <= 65535) {
            node.server.listen({ port: node.port, host: '::' }, (err /*, address*/) => {
                if (!err) {
                    console.info('Shelly gen1 server is listening on port ' + node.port);
                } else {
                    node.error('Shelly gen1 server failed to listen on port ' + node.port);
                }
            });

            node.server.get('/webhook', (request, reply) => {
                const queryFields = request.query.data.split('?');
                const query = {
                    hookType: queryFields[0],
                    index: queryFields[1],
                    sender: queryFields[2],
                };
                const data = {
                    hookType: queryFields[0],
                    index: queryFields[1],
                    sender: queryFields[2],
                    event: query, // request.body is null
                };
                node.emit('callback', data);
                reply.code(200);
                reply.send();
            });
        } else {
            node.error('Shelly gen1 server failed to start: port number is not betwee 0 and 65535: ' + node.port);
        }

        this.on('close', function (removed, done) {
            node.server.close().then(() => {
                done();
            });
        });
    }

    return ShellyGen1ServerNode;
};
