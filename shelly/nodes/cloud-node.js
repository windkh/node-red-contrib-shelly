module.exports = function (RED) {
    'use strict';

    const utils = require('../lib/utils.js');

    const axios = require('axios').default;

    const rateLimit = require('axios-rate-limit');
    const cloudAxios = rateLimit(axios.create(), { maxRequests: 1, perMilliseconds: 1000, maxRPS: 1 });

    function encodeParams(data) {
        Object.keys(data).forEach((key) => data[key] === undefined && delete data[key]);
        let params = new URLSearchParams(data).toString();
        return params;
    }

    function encodeArrayParams(data) {
        let params = JSON.stringify(data);
        return params;
    }

    // generic REST cloud request wrapper
    async function shellyCloudRequestAsync(method, route, data, credentials, timeout) {
        if (timeout === undefined || timeout === null) {
            timeout = 10000;
        }

        // We avoid an invalid timeout by taking a default if 0.
        let requestTimeout = timeout;
        if (requestTimeout <= 0) {
            requestTimeout = 10000;
        }

        let encodedData = 'auth_key=' + credentials.authKey;
        if (data !== undefined && data !== null) {
            encodedData += '&' + data;
        }

        let baseUrl = credentials.serverUri;
        let config = {
            baseURL: baseUrl,
            url: route,
            method: method,
            data: encodedData,
            timeout: requestTimeout,
            validateStatus: (status) => status === 200,
        };

        let result;
        const response = await cloudAxios.request(config);
        if (response.status == 200) {
            result = response.data;
        } else {
            throw new Error(response.statusText + ' ' + config.url);
        }

        return result;
    }

    // --------------------------------------------------------------------------------------------
    // The shelly node controls a shelly via cloud api.
    function ShellyCloudNode(config) {
        RED.nodes.createNode(this, config);
        let node = this;

        node.server = RED.nodes.getNode(config.server);

        node.status({});

        this.on('input', async function (msg) {
            try {
                let route;
                let params;
                if (utils.isMsgPayloadValid(msg)) {
                    let type = msg.payload.type;
                    if (type === 'light') {
                        route = '/device/light/control';

                        let data = {
                            id: msg.payload.id,
                            channel: msg.payload.channel,
                            turn: msg.payload.turn,
                            brightness: msg.payload.brightness,
                            white: msg.payload.white,
                            red: msg.payload.red,
                            green: msg.payload.green,
                            blue: msg.payload.blue,
                            gain: msg.payload.gain,
                        };
                        params = encodeParams(data);
                    } else if (type === 'relay') {
                        route = '/device/relay/control';

                        let data = {
                            id: msg.payload.id,
                            channel: msg.payload.channel,
                            turn: msg.payload.turn,
                        };
                        params = encodeParams(data);
                    } else if (type === 'roller') {
                        route = '/device/relay/roller/control';

                        let data = {
                            id: msg.payload.id,
                            channel: msg.payload.channel,
                            direction: msg.payload.direction,
                            pos: msg.payload.pos,
                        };
                        params = encodeParams(data);
                    } else if (type === 'relays') {
                        route = '/device/relay/bulk_control';

                        let data = {
                            turn: msg.payload.turn,
                        };
                        params = encodeParams(data);
                        params += '&devices=' + encodeArrayParams(msg.payload.devices);
                    } else if (type === 'status') {
                        route = '/device/status';

                        let data = {
                            id: msg.payload.id,
                        };
                        params = encodeParams(data);
                    } else if (type === 'all_status') {
                        route = '/device/all_status';

                        let data = {
                            show_info: msg.payload.show_info,
                            no_shared: msg.payload.no_shared,
                        };
                        params = encodeParams(data);
                    } else {
                        // nothing to do
                    }
                }

                if (route) {
                    let credentials = node.server.getCredentials();
                    let body = await shellyCloudRequestAsync('POST', route, params, credentials);

                    node.status({ fill: 'green', shape: 'ring', text: 'OK' });

                    let status = body;
                    // msg.status = status;
                    msg.payload = status;
                    node.send([msg]);
                } else {
                    node.send([msg]);
                }
            } catch (error) {
                node.status({ fill: 'red', shape: 'ring', text: error });
                node.error('Failed to get status: ' + error, error);
            }
        });

        this.on('close', function (done) {
            node.status({});
            done();
        });
    }

    return ShellyCloudNode;
};
