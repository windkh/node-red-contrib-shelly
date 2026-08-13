module.exports = function (RED) {
    'use strict';

    const utils = require('../lib/utils.js');

    const axios = require('axios').default;

    const rateLimit = require('axios-rate-limit');
    const cloudAxios = rateLimit(axios.create(), { maxRequests: 1, perMilliseconds: 1000, maxRPS: 1 });

    const { buildRequestV1 } = require('./cloud/parsers/v1.js');
    const { buildRequestV2 } = require('./cloud/parsers/v2.js');
    const { describeCloudErrorV2 } = require('./cloud/errors.js');
    const { V2 } = require('./cloud/api-version.js');

    function getRequestTimeout(timeout) {
        let requestTimeout = 10000;

        // We avoid an invalid timeout by taking a default if 0 or unset.
        if (timeout !== undefined && timeout !== null && timeout > 0) {
            requestTimeout = timeout;
        }

        return requestTimeout;
    }

    // generic REST cloud request wrapper (v1: form-urlencoded body carrying the auth key)
    async function shellyCloudRequestAsync(method, route, data, credentials, timeout) {
        let encodedData = 'auth_key=' + credentials.authKey;
        if (data !== undefined && data !== null) {
            encodedData += '&' + data;
        }

        const baseUrl = credentials.serverUri;
        const config = {
            baseURL: baseUrl,
            url: route,
            method: method,
            data: encodedData,
            timeout: getRequestTimeout(timeout),
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

    // v2 request wrapper: auth key in the query string, command as a JSON body.
    async function shellyCloudRequestV2Async(route, body, credentials, timeout) {
        const config = {
            baseURL: credentials.serverUri,
            url: route + '?auth_key=' + encodeURIComponent(credentials.authKey),
            method: 'POST',
            data: body,
            timeout: getRequestTimeout(timeout),
            validateStatus: (status) => status === 200,
        };

        let result;
        try {
            const response = await cloudAxios.request(config);
            result = response.data;
        } catch (error) {
            throw new Error(describeCloudErrorV2(error), { cause: error });
        }

        return result;
    }

    // --------------------------------------------------------------------------------------------
    // The shelly node controls a shelly via cloud api.
    function ShellyCloudNode(config) {
        RED.nodes.createNode(this, config);
        const node = this;

        node.server = RED.nodes.getNode(config.server);

        node.status({});

        this.on('input', async function (msg) {
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
                    const reason =
                        command === undefined ? 'no command in msg.payload' : 'unknown command "' + command + '"';
                    const text = reason + ' for cloud API ' + apiVersion;

                    node.status({ fill: 'red', shape: 'ring', text: text });
                    node.error(text, msg);
                }
            } catch (error) {
                node.status({ fill: 'red', shape: 'ring', text: error.message });
                node.error('Failed to get status: ' + error.message);
            }
        });

        this.on('close', function (done) {
            node.status({});
            done();
        });
    }

    return ShellyCloudNode;
};
