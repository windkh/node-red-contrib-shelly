module.exports = function (RED) {
    'use strict';

    const utils = require('../lib/utils.js');
    const shelly = require('../lib/shelly.js');
    const configuration = require('../lib/configuration.js');

    const axios = require('axios').default;

    const fs = require('fs');
    // const { readFile } = require('fs/promises'); see #96 nodejs V19

    const path = require('path');
    // const path = require('node:path'); see #99 nodejs V19

    // The name of the script for callback mode.
    const callbackScript = '../scripts/callback.js';

    // The name of the script for callback mode for bluetooth devices.
    const bluCallbackScript = '../scripts/ble-shelly-blu.js';
    
    // Uploads and enables a skript.
    async function tryInstallScriptAsync(node, script, scriptName) {
        let success = false;
        if (node.hostname !== '') {
            node.status({ fill: 'yellow', shape: 'ring', text: 'Uploading script...' });

            let credentials = shelly.getCredentials(node);

            try {
                // Remove all old scripts first
                let scriptListResponse = await shelly.shellyRequestAsync(node.axiosInstance, 'GET', '/rpc/Script.List', null, null, credentials);
                for (let scriptItem of scriptListResponse.scripts) {
                    if (scriptItem.name == scriptName) {
                        let stopParams = { id: scriptItem.id };
                        await shelly.shellyRequestAsync(node.axiosInstance, 'POST', '/rpc/Script.Stop', null, stopParams, credentials);

                        let deleteParams = { id: scriptItem.id };
                        await shelly.shellyRequestAsync(node.axiosInstance, 'POST', '/rpc/Script.Delete', null, deleteParams, credentials);
                    }
                }

                let createParams = { name: scriptName };
                let createScriptResonse = await shelly.shellyRequestAsync(node.axiosInstance, 'POST', '/rpc/Script.Create', null, createParams, credentials);
                let scriptId = createScriptResonse.id;

                const chunkSize = 1024;
                let done = false;
                let first = true;
                do {
                    let codeToSend;
                    if (script.length > chunkSize) {
                        codeToSend = script.substr(0, chunkSize);
                        script = script.substr(chunkSize);
                    } else {
                        codeToSend = script;
                        done = true;
                    }

                    let putParams = {
                        id: scriptId,
                        code: codeToSend,
                        append: !first,
                    };
                    await shelly.shellyRequestAsync(node.axiosInstance, 'POST', '/rpc/Script.PutCode', null, putParams, credentials);
                    first = false;
                } while (!done);

                let configParams = {
                    id: scriptId,
                    config: { enable: true },
                };
                await shelly.shellyRequestAsync(node.axiosInstance, 'POST', '/rpc/Script.SetConfig', null, configParams, credentials);

                let startParams = {
                    id: scriptId,
                };
                await shelly.shellyRequestAsync(node.axiosInstance, 'POST', '/rpc/Script.Start', null, startParams, credentials);

                let statusParams = {
                    id: scriptId,
                };
                let status = await shelly.shellyRequestAsync(node.axiosInstance, 'POST', '/rpc/Script.GetStatus', null, statusParams, credentials);

                if (status.running === true) {
                    node.status({ fill: 'green', shape: 'ring', text: 'Connected.' });
                    success = true;
                } else {
                    node.error('Uploaded script not running.');
                    node.status({ fill: 'red', shape: 'ring', text: 'Script not running.' });
                }
            } catch (error) {
                node.error('Uploading script failed.', error);
                if (error.request !== undefined) {
                    node.error('Request: ' + error.request.method + ' ' + error.request.path);
                }
                node.status({ fill: 'red', shape: 'ring', text: 'Uploading script failed ' });
            }
        } else {
            node.status({ fill: 'red', shape: 'ring', text: 'Hostname not configured' });
        }

        return success;
    }

    async function tryUninstallScriptAsync(node, scriptName) {
        let success = false;
        if (node.hostname !== '') {
            let credentials = shelly.getCredentials(node);

            try {
                let scriptListResponse = await shelly.shellyRequestAsync(node.axiosInstance, 'GET', '/rpc/Script.List', null, null, credentials);

                for (let scriptItem of scriptListResponse.scripts) {
                    if (scriptItem.name == scriptName) {
                        let params = {
                            id: scriptItem.id,
                        };
                        let status = await shelly.shellyRequestAsync(node.axiosInstance, 'POST', '/rpc/Script.GetStatus', null, params, credentials);

                        if (status.running === true) {
                            await shelly.shellyRequestAsync(node.axiosInstance, 'POST', '/rpc/Script.Stop', null, params, credentials);
                        }

                        await shelly.shellyRequestAsync(node.axiosInstance, 'POST', '/rpc/Script.Delete', null, params, credentials);
                    }
                }
            } catch (error) {
                if (node.verbose) {
                    node.error('Uninstalling script failed.', error);
                }
                node.status({ fill: 'red', shape: 'ring', text: 'Uninstalling script failed ' });
            }
        } else {
            node.status({ fill: 'red', shape: 'ring', text: 'Hostname not configured' });
        }

        return success;
    }

    // Installs a webhook.
    async function tryInstallWebhook2Async(node, webhookUrl, webhookName) {
        let success = false;
        if (node.hostname !== '') {
            node.status({ fill: 'yellow', shape: 'ring', text: 'Installing webhook...' });

            let credentials = shelly.getCredentials(node);

            try {
                // Remove all old webhooks async.
                let webhookListResponse = await shelly.shellyRequestAsync(node.axiosInstance, 'GET', '/rpc/Webhook.List', null, null, credentials);
                for (let webhookItem of webhookListResponse.hooks) {
                    if (webhookItem.name == webhookName) {
                        let deleteParams = { id: webhookItem.id };
                        /*let deleteWebhookResonse =*/ await shelly.shellyRequestAsync(
                            node.axiosInstance,
                            'POST',
                            '/rpc/Webhook.Delete',
                            null,
                            deleteParams,
                            credentials
                        );
                    }
                }

                // Create new webhooks.
                let supportedEventsResponse = await shelly.shellyRequestAsync(node.axiosInstance, 'GET', '/rpc/Webhook.ListSupported', null, null, credentials);
                let hookTypes = supportedEventsResponse.hook_types; // before fw 1.0
                if (hookTypes) {
                    for (let hookType of hookTypes) {
                        let sender = node.hostname;
                        let url = webhookUrl + '?hookType=' + hookType + '&sender=' + sender;
                        let createParams = {
                            name: webhookName,
                            event: hookType,
                            cid: 0,
                            enable: true,
                            urls: [url],
                        };
                        /*let createWebhookResponse =*/ await shelly.shellyRequestAsync(
                            node.axiosInstance,
                            'POST',
                            '/rpc/Webhook.Create',
                            null,
                            createParams,
                            credentials
                        );

                        node.status({ fill: 'green', shape: 'ring', text: 'Connected.' });
                        success = true;
                    }
                } else {
                    hookTypes = supportedEventsResponse.types; // after fw 1.0
                    for (let hookType in hookTypes) {
                        if (Object.prototype.hasOwnProperty.call(hookTypes, hookType)) {
                            let sender = node.hostname;
                            let url = webhookUrl + '?hookType=' + hookType + '&sender=' + sender;
                            let createParams = {
                                name: webhookName,
                                event: hookType,
                                cid: 0,
                                enable: true,
                                urls: [url],
                            };
                            /*let createWebhookResonse =*/ await shelly.shellyRequestAsync(
                                node.axiosInstance,
                                'POST',
                                '/rpc/Webhook.Create',
                                null,
                                createParams,
                                credentials
                            );

                            node.status({ fill: 'green', shape: 'ring', text: 'Connected.' });
                            success = true;
                        }
                    }
                }
            } catch (error) {
                if (node.verbose) {
                    node.warn('Installing webhook failed ' + error);
                    // node.status({ fill: "red", shape: "ring", text: "Installing webhook failed "});
                }
            }
        } else {
            node.status({ fill: 'red', shape: 'ring', text: 'Hostname not configured' });
        }

        return success;
    }

    // Uninstalls a webhook.
    async function tryUninstallWebhook2Async(node, webhookName) {
        let success = false;
        if (node.hostname !== '') {
            // node.status({ fill: "yellow", shape: "ring", text: "Uninstalling webhook..." });

            let credentials = shelly.getCredentials(node);

            try {
                let webhookListResponse = await shelly.shellyRequestAsync(node.axiosInstance, 'GET', '/rpc/Webhook.List', null, null, credentials);

                for (let webhookItem of webhookListResponse.hooks) {
                    if (webhookItem.name == webhookName) {
                        let deleteParams = { id: webhookItem.id };
                        /*let deleteWebhookResonse =*/ await shelly.shellyRequestAsync(
                            node.axiosInstance,
                            'POST',
                            '/rpc/Webhook.Delete',
                            null,
                            deleteParams,
                            credentials
                        );
                    }
                }
            } catch (error) {
                if (node.verbose) {
                    node.warn('Uninstalling webhook failed ' + error);
                    // node.status({ fill: "red", shape: "ring", text: "Uninstalling webhook failed "});
                }
            }
        } else {
            node.status({ fill: 'red', shape: 'ring', text: 'Hostname not configured' });
        }

        return success;
    }

    // Converts a payload to one single request
    function inputParserGeneric2(command) {
        let method = 'POST';
        let data;
        let route;

        let rpcMethod;
        if (command.method !== undefined) {
            rpcMethod = command.method;
        }

        let parameters;
        if (command.parameters !== undefined) {
            parameters = command.parameters;
        }

        if (rpcMethod !== undefined) {
            route = '/rpc/';
            data = {
                id: 1,
                method: rpcMethod,
                params: parameters,
            };
        }

        let request = {
            route: route,
            method: method,
            data: data,
        };

        return request;
    }

    // Creates request(s) from the input or input arrays.
    function inputParserGeneric2Array(msg) {
        let requests = [];

        if (utils.isMsgPayloadValidOrArray(msg)) {
            if (!Array.isArray(msg.payload)) {
                let request = inputParserGeneric2(msg.payload);
                requests.push(request);
            } else {
                msg.payload.forEach((payload) => {
                    let request = inputParserGeneric2(payload);
                    requests.push(request);
                });
            }
        }

        return requests;
    }

    // returns an empty array.
    function inputParserEmptyArray2(/*msg*/) {
        let requests = [];
        return requests;
    }

    // Returns the input parser for the device type.
    function getInputParser2(deviceType) {
        let result;

        switch (deviceType) {
            case 'Relay':
            case 'Button':
            case 'Measure':
            case 'Dimmer':
            case 'RGBW':
            case 'Thermostat':
            case 'BluGateway':
                result = inputParserGeneric2Array;
                break;
            default:
                result = inputParserEmptyArray2;
                break;
        }
        return result;
    }

    // starts the polling mode.
    async function initializer2(node, types) {
        let success = false;

        let checkOK = await shelly.tryCheckDeviceType(node, types);
        if (checkOK === true) {
            let mode = node.mode;
            if (mode === 'polling') {
                shelly.start(node, types);
                success = true;
            } else if (mode === 'callback') {
                node.error('Callback not supported for this type of device.');
                node.status({ fill: 'red', shape: 'ring', text: 'Callback not supported' });
            } else {
                // nothing to do.
                success = true;
            }
        }

        return success;
    }

    // starts polling or uploads a skript that calls a REST callback.
    async function initializer2CallbackAsync(node, types) {
        let success = false;

        let checkOK = await shelly.tryCheckDeviceType(node, types);
        if (checkOK === true) {
            const scriptName = 'node-red-contrib-shelly';
            await tryUninstallScriptAsync(node, scriptName); // we ignore if it failed.

            let mode = node.mode;
            if (mode === 'polling') {
                await shelly.startAsync(node, types);
                success = true;
            } else if (mode === 'callback') {
                let scriptPath = path.resolve(__dirname, callbackScript);
                const buffer = fs.readFileSync(scriptPath);
                // const buffer = await readFile(scriptPath); #96 nodejs V19
                let script = buffer.toString();

                let ipAddress = shelly.getIPAddress(node);
                let url = 'http://' + ipAddress + ':' + node.server.port + '/callback';
                script = utils.replace(script, '%URL%', url);
                let sender = node.hostname;
                script = utils.replace(script, '%SENDER%', sender);

                success = await tryInstallScriptAsync(node, script, scriptName);
            } else {
                // nothing to do.
                success = true;
            }
        }

        return success;
    }

    // like initializer2CallbackAsync it installs a callback script
    // and in addition to that it installs a BLU scanner that emits catured bluetooth messages.
    async function initializer2BluCallbackAsync(node, types) {
        let success = false;

        let checkOK = await shelly.tryCheckDeviceType(node, types);
        if (checkOK === true) {
            const scriptName = 'node-red-contrib-shelly-blu';
            await tryUninstallScriptAsync(node, scriptName); // we ignore if it failed.

            let mode = node.mode;
            if (mode === 'callback') {
                let scriptPath = path.resolve(__dirname, bluCallbackScript);
                const buffer = fs.readFileSync(scriptPath);
                // const buffer = await readFile(scriptPath); #96 nodejs V19
                let script = buffer.toString();
                success = await tryInstallScriptAsync(node, script, scriptName);
            } else {
                // nothing to do.
                success = true;
            }

            if (success) {
                success = await initializer2CallbackAsync(node, types);
            }
        }

        return success;
    }

    // starts polling or installs a webhook that calls a REST callback.
    async function initializer2WebhookAsync(node, types) {
        let success = false;

        let checkOK = await shelly.tryCheckDeviceType(node, types);
        if (checkOK === true) {
            const webhookName = 'node-red-contrib-shelly';
            await tryUninstallWebhook2Async(node, webhookName); // we ignore if it failed.

            let mode = node.mode;
            if (mode === 'polling') {
                await shelly.startAsync(node, types);
                success = true;
            } else if (mode === 'callback') {
                let ipAddress = shelly.getIPAddress(node);
                let webhookUrl = 'http://' + ipAddress + ':' + node.server.port + '/webhook';
                success = await tryInstallWebhook2Async(node, webhookUrl, webhookName);
            } else {
                // nothing to do.
                success = true;
            }
        }

        return success;
    }

    // Gets a function that initialize the device.
    function getInitializer2(node) {
        let deviceType = node.deviceType;
        let result;

        switch (deviceType) {
            case 'Button':
            case 'Relay':
            case 'Measure':
            case 'Dimmer':
            case 'RGBW':
                if (node.captureBlutooth) {
                    result = initializer2BluCallbackAsync;
                } else {
                    result = initializer2CallbackAsync;
                }
                break;
            case 'BluGateway':
                // Here we force the capturing f blutooth messages for this specific device.
                node.captureBlutooth = true;
                result = initializer2BluCallbackAsync;
                break;
            case 'Sensor':
                result = initializer2WebhookAsync;
                break;
            default:
                result = initializer2;
                break;
        }
        return result;
    }

    // Returns a status object with filtered properties.
    function convertStatus2(status) {
        let result = {};

        Object.keys(status).forEach((key) => {
            let statusValue = status[key];
            if (statusValue !== undefined) {
                // we only copy the key that contain a : like input:0...
                let newKey;
                if (key.indexOf(':') !== -1) {
                    newKey = utils.replace(key, ':', '');
                    result[newKey] = statusValue;
                } else {
                    newKey = key;
                }
                result[newKey] = statusValue;
            }
        });

        return result;
    }

    async function executeCommand2(msg, request, node, credentials) {
        let getStatusRoute = '/rpc/Shelly.GetStatus';
        let route = getStatusRoute;

        try {
            if (request !== undefined && request.route !== undefined && request.route !== '') {
                route = request.route;
                let method = request.method;
                let data = request.data;
                let params = request.params;
                let body = await shelly.shellyRequestAsync(node.axiosInstance, method, route, params, data, credentials, 5020);

                if (node.getStatusOnCommand) {
                    route = getStatusRoute;
                    let data;
                    let params;
                    let body = await shelly.shellyRequestAsync(node.axiosInstance, 'GET', route, params, data, credentials, 5021);
                    node.status({ fill: 'green', shape: 'ring', text: 'Connected.' });

                    let status = body;
                    msg.status = status;
                    msg.payload = convertStatus2(status);
                    node.send([msg]);
                } else {
                    node.status({ fill: 'green', shape: 'ring', text: 'Connected.' });

                    msg.payload = body;
                    node.send([msg]);
                }
            } else {
                route = getStatusRoute;
                let data;
                let params;
                let body = await shelly.shellyRequestAsync(node.axiosInstance, 'GET', route, params, data, credentials, 5022);
                node.status({ fill: 'green', shape: 'ring', text: 'Connected.' });

                let status = body;
                msg.status = status;
                msg.payload = convertStatus2(status);
                node.send([msg]);
            }
        } catch (error) {
            if (msg.payload) {
                node.status({ fill: 'yellow', shape: 'ring', text: error.message });
                // if (node.verbose) {
                node.warn(error.message);
                // }
            } else {
                node.status({ fill: 'red', shape: 'ring', text: 'Error: ' + error });
                // if (node.verbose) {
                node.warn('Error in executeCommand2: ' + route + '  --> ' + error);
                // }
            }
        }
    }

    function ShellyGen2Node(config) {
        RED.nodes.createNode(this, config);
        let node = this;

        node.server = RED.nodes.getNode(config.server);
        node.outputMode = config.outputmode;

        if (config.uploadretryinterval !== undefined) {
            node.initializeRetryInterval = parseInt(config.uploadretryinterval);
        } else {
            node.initializeRetryInterval = 5006;
        }

        node.verbose = config.verbose;
        node.hostname = utils.trim(config.hostname);
        node.authType = 'Digest';
        node.pollInterval = parseInt(config.pollinginterval);
        node.pollStatus = config.pollstatus;
        node.getStatusOnCommand = config.getstatusoncommand;

        let deviceType = config.devicetype;
        node.deviceTypeMustMatchExactly = config.devicetypemustmatchexactly || false;
        node.captureBlutooth = config.captureblutooth || false;

        node.mode = config.mode;
        if (!node.mode) {
            node.mode = 'polling';
        }

        node.status({});

        if (deviceType !== undefined && deviceType !== '') {
            node.axiosInstance = axios.create({
                baseURL: 'http://' + node.hostname + '/',
                timeout: 5000,
            });

            if (configuration.isExactTypeGen2(deviceType)) {
                node.model = deviceType; // device type is a specific model here
                node.deviceType = configuration.getDeviceType(node.model);
                node.types = [deviceType];
            } else {
                node.model = '';
                node.deviceType = deviceType;
                node.types = configuration.getDeviceTypes2(node.deviceType, node.deviceTypeMustMatchExactly);
            }

            node.initializer = getInitializer2(node);
            node.inputParser = getInputParser2(node.deviceType);

            (async () => {
                let initialized = await node.initializer(node, node.types);

                // if the device is not online, then we wait until it is available and try again.
                if (!initialized) {
                    node.initializeTimer = setInterval(async function () {
                        let initialized = await node.initializer(node, node.types);
                        if (initialized) {
                            clearInterval(node.initializeTimer);
                        }
                    }, node.initializeRetryInterval);
                }
            })();

            this.on('input', async function (msg) {
                let credentials = shelly.getCredentials(node, msg);
                let requests = await node.inputParser(msg, node, credentials);

                if (requests.length == 0) {
                    let request; // here the request is undefined to trigger a simple get status.
                    executeCommand2(msg, request, node, credentials);
                } else {
                    requests.forEach((request) => {
                        executeCommand2(msg, request, node, credentials);
                    });
                }
            });

            // Callback mode:
            if (node.server !== null && node.server !== undefined && node.mode === 'callback') {
                node.onCallback = function (data) {
                    if (data.sender === node.hostname) {
                        if (node.outputMode === 'event') {
                            let msg = {
                                payload: data.event,
                            };
                            node.send([msg]);
                        } else if (node.outputMode === 'status') {
                            node.emit('input', {});
                        } else {
                            // not implemented
                        }
                    }
                };
                node.server.addListener('callback', node.onCallback);
            }

            this.on('close', function (done) {
                node.status({});

                if (node.onCallback) {
                    node.server.removeListener('callback', node.onCallback);
                }

                // TODO: call node.uninitializer();
                clearInterval(node.pollingTimer);
                clearInterval(node.initializeTimer);
                done();
            });
        } else {
            node.status({ fill: 'red', shape: 'ring', text: 'DeviceType not configured.' });
            node.warn('DeviceType not configured');
        }
    }

    return ShellyGen2Node;
};
