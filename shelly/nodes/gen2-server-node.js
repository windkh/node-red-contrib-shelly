module.exports = function (RED) {
    'use strict';

    const fastify = require('fastify');

    function ShellyGen2ServerNode(config) {
        RED.nodes.createNode(this, config);

        let node = this;
        this.port = parseInt(config.port);
        this.hostname = config.hostname;
        this.hostip = config.hostip;
        this.server = fastify({
            logger: false, // set to true when debugging.
        });

        if (node.port > 0 && node.port <= 65535) {
            node.server.put('/callback', (request, reply) => {
                let data = {
                    sender: request.body.sender,
                    event: request.body.event,
                };
                node.emit('callback', data);
                reply.code(200);
                reply.send();
            });

            node.server.get('/webhook', (request, reply) => {
                let data = {
                    hookType: request.query.hookType,
                    sender: request.query.sender,
                    event: request.query, // request.body is null
                };
                node.emit('callback', data);
                reply.code(200);
                reply.send();
            });

            node.server.listen({ port: node.port, host: '::' }, (err /*, address*/) => {
                if (!err) {
                    console.info('Shelly gen2 server is listening on port ' + node.port);
                } else {
                    node.error('Shelly gen2 server failed to listen on port ' + node.port);
                }
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

    return ShellyGen2ServerNode;
};
