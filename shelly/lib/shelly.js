const utils = require('./utils.js');

const crypto = require('crypto');
// const crypto = require('node:crypto'); see #99 nodejs V19

const axios = require('axios').default;

let nonceCount = 1;

// gets all IP addresses: https://stackoverflow.com/questions/3653065/get-local-ip-address-in-node-js?page=2&tab=scoredesc#tab-top
function getIPAddresses() {
    const ipAddresses = [];

    const interfaces = require('os').networkInterfaces();
    for (const devName in interfaces) {
        const iface = interfaces[devName];
        for (let i = 0; i < iface.length; i++) {
            const alias = iface[i];
            if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal) {
                ipAddresses.push(alias.address);
            }
        }
    }

    return ipAddresses;
}

// Gets the local IP address from the node or using auto detection.
function getIPAddress(node) {
    let ipAddress;

    if (node.server.hostip !== undefined && node.server.hostip !== '' && node.server.hostip !== 'hostname') {
        ipAddress = node.server.hostip;
    } else if (node.server.hostip === 'hostname' && node.server.hostname !== undefined && node.server.hostname !== '') {
        ipAddress = node.server.hostname;
    } else {
        const ipAddresses = getIPAddresses();
        if (ipAddresses !== undefined && ipAddresses.length > 0) {
            ipAddress = ipAddresses[0];
        } else {
            node.error('Could not detect local IP address: please configure hostname.');
        }
    }

    return ipAddress;
}

// Describes a failed request in one line, for the node status and msg.error.
// axios puts the syscall and the host in the message ("getaddrinfo ENOTFOUND
// shelly.local"), but for a timeout the message alone ("timeout of 5000ms
// exceeded") does not say which layer gave up, so the code is appended when it
// is not already part of the message.
function describeError(error) {
    let description = error.message;
    if (error.code && !description.includes(error.code)) {
        description = description + ' (' + error.code + ')';
    }

    return description;
}

// Reports an error that escaped an initializer.
// Both device nodes drive their initializer from an async IIFE and from a setInterval callback, and
// neither observes a rejection. Anything thrown in there — including from a catch block that assumed
// a property the error does not carry — therefore became an unhandled rejection, which node kills the
// process for, taking every unrelated flow down with it. See #261.
function reportInitializationError(node, error) {
    const reason = describeError(error);
    node.status({ fill: 'red', shape: 'ring', text: 'Initialization failed: ' + reason });

    // The initializer retries on a timer, so an unchanged reason would otherwise be logged once
    // per initializeRetryInterval for as long as the device stays broken.
    if (node.lastInitializationError !== reason) {
        node.lastInitializationError = reason;
        node.error('Initialization failed: ' + reason);
    }
}

// Gets a header with the authorization property for the request.
function getHeaders(credentials) {
    const headers = {};

    if (credentials) {
        if (credentials.authType === 'Basic') {
            if (credentials.username && credentials.password) {
                // Authorization is case sensitive for some devices like the TRV!
                headers.Authorization =
                    'Basic ' + Buffer.from(credentials.username + ':' + credentials.password).toString('base64');
            }
        }
    }

    return headers;
}

// Encrypts a string using SHA-256.
function sha256(str) {
    const result = crypto.createHash('sha256').update(str).digest('hex');
    return result;
}

// see https://shelly-api-docs.shelly.cloud/gen2/General/Authentication
// see https://github.com/axios/axios/issues/686
function getDigestAuthorization(response, credentials, config) {
    const authDetails = response.headers['www-authenticate'].split(', ');
    const propertiesArray = authDetails.map((v) => v.split('='));
    const properties = new Map(propertiesArray.map((obj) => [obj[0], obj[1]]));

    nonceCount++; // global counter
    const url = config.url;
    const method = config.method;

    // let algorithm = properties.get('algorithm'); // TODO: check if it is still SHA-256
    const username = credentials.username;
    const password = credentials.password;
    const realm = utils.replace(properties.get('realm'), /"/g, '');
    const authParts = [username, realm, password];

    const ha1String = authParts.join(':');
    const ha1 = sha256(ha1String);
    const ha2String = method + ':' + url;
    const ha2 = sha256(ha2String);
    const nc = ('00000000' + nonceCount).slice(-8);
    const nonce = utils.replace(properties.get('nonce'), /"/g, '');
    const cnonce = crypto.randomBytes(24).toString('hex');
    const responseString = ha1 + ':' + nonce + ':' + nc + ':' + cnonce + ':' + 'auth' + ':' + ha2;
    const responseHash = sha256(responseString);

    const authorization =
        'Digest username="' +
        username +
        '", realm="' +
        realm +
        '", nonce="' +
        nonce +
        '", uri="' +
        url +
        '", cnonce="' +
        cnonce +
        '", nc=' +
        nc +
        ', qop=auth' +
        ', response="' +
        responseHash +
        '", algorithm=SHA-256';
    return authorization;
}

// generic REST request wrapper.
async function shellyRequestAsync(axiosInstance, method, route, params, data, credentials, timeout) {
    if (timeout === undefined || timeout === null) {
        timeout = 10001;
    }

    // We avoid an invalid timeout by taking a default if 0.
    let requestTimeout = timeout;
    if (requestTimeout <= 0) {
        requestTimeout = 10002;
    }

    const headers = getHeaders(credentials);

    const baseUrl = 'http://' + credentials.hostname;
    const config = {
        baseURL: baseUrl,
        url: route,
        method: method,
        params: params,
        data: data,
        headers: headers,
        timeout: requestTimeout,
        validateStatus: (status) => status === 200 || status === 401,
    };

    let result;
    try {
        const response = await axiosInstance.request(config);
        if (response.status == 200) {
            result = response.data;
        } else if (response.status == 401) {
            config.headers = {
                Authorization: getDigestAuthorization(response, credentials, config),
            };

            const digestResponse = await axiosInstance.request(config);
            if (digestResponse.status == 200) {
                result = digestResponse.data;
            } else {
                throw new Error(digestResponse.statusText + ' ' + config.url);
            }
        } else {
            throw new Error(response.statusText + ' ' + config.url);
        }
    } catch (error) {
        // Surface the device's response body so callers see the real diagnostic
        // (Shelly gen2 RPC returns errors like {"error":{"code":-103,"message":"..."}}
        // in the body; without this enrichment users only see axios's generic
        // "Request failed with status code 400").
        if (error.response && error.response.data !== undefined) {
            const body =
                typeof error.response.data === 'string' ? error.response.data : JSON.stringify(error.response.data);
            // `cause` keeps the original axios error (response, config, stack) reachable instead of
            // discarding it; the message stays byte-identical for callers that surface msg.error.
            throw new Error(error.message + ' (' + config.url + '): ' + body, { cause: error });
        }
        throw error;
    }

    return result;
}

// checks if the device is reachable and returns the shelly info. Note that /shelly does not require any credentials.
async function getShellyInfo(hostname) {
    let shellyInfo;

    // (gen 2 return the same info for /rpc/Shelly.GetDeviceInfo)
    try {
        const credentials = {
            hostname: hostname,
        };
        shellyInfo = await shellyRequestAsync(axios, 'GET', '/shelly', null, null, credentials);
    } catch {
        // Same contract as the admin-UI probe: an unreachable host yields an empty info
        // object, not an exception.
        shellyInfo = {};
    }

    return shellyInfo;
}

// extracts the credentials from the message and the node.
function getCredentials(node, msg) {
    let hostname;
    let username;
    let password;
    if (utils.isMsgPayloadValid(msg)) {
        // Normalised like the configured hostname: a value that arrives from a template
        // or a UI upstream easily carries whitespace or a pasted 'http://' prefix, and
        // neither survives concatenation into a URL. See #277.
        hostname = utils.trimHostname(msg.payload.hostname);
        username = msg.payload.username;
        password = msg.payload.password;
    }

    // Empty or whitespace-only is not an address, so it falls back to the node's own
    // hostname instead of producing a request to 'http://'.
    if (hostname === undefined || hostname === '') {
        hostname = node.hostname;
    }

    if (username === undefined) {
        username = node.credentials.username;
    }

    if (password === undefined) {
        password = node.credentials.password;
    }

    const authType = node.authType;
    if (authType === 'Digest') {
        username = 'admin'; // see https://shelly-api-docs.shelly.cloud/gen2/General/Authentication
    }

    const credentials = {
        hostname: hostname,
        authType: authType,
        username: username,
        password: password,
    };

    return credentials;
}

// Hint: the /shelly route can be accessed without authorization
async function shellyPing(node, credentials, types) {
    let found = false;

    // gen 1 and gen 2 devices support this endpoint (gen 2 return the same info for /rpc/Shelly.GetDeviceInfo)
    try {
        const body = await shellyRequestAsync(
            node.axiosInstance,
            'GET',
            '/shelly',
            null,
            null,
            credentials,
            node.pollInterval
        );

        node.shellyInfo = body;
        node.lastError = undefined;

        let requiredNodeType;
        let deviceType;
        // Generation 1 devices
        if (node.shellyInfo.type) {
            deviceType = node.shellyInfo.type;
            requiredNodeType = 'shelly-gen1';
        } // Generation 2 devices
        else if (node.shellyInfo.model && node.shellyInfo.gen === 2) {
            deviceType = node.shellyInfo.model;
            requiredNodeType = 'shelly-gen2';
        } // Generation 3 devices
        else if (node.shellyInfo.model && node.shellyInfo.gen === 3) {
            deviceType = node.shellyInfo.model;
            requiredNodeType = 'shelly-gen2'; // right now the protocol is compatible to gen 2
        } // Generation 4 devices
        else if (node.shellyInfo.model && node.shellyInfo.gen === 4) {
            deviceType = node.shellyInfo.model;
            requiredNodeType = 'shelly-gen2'; // right now the protocol is compatible to gen 2
        } else {
            // this can not happen right now.
            requiredNodeType = 'shelly gen-type is not supported';
        }

        if (requiredNodeType === node.type) {
            for (let i = 0; i < types.length; i++) {
                const type = types[i];

                // Generation 1 devices
                if (deviceType) {
                    found = deviceType.startsWith(type);
                    if (found) {
                        break;
                    }
                }
            }

            if (found) {
                node.status({ fill: 'green', shape: 'ring', text: 'Connected.' });
            } else {
                node.status({
                    fill: 'red',
                    shape: 'ring',
                    text: 'Shelly type mismatch: ' + deviceType + ' not found in [' + types.join(',') + ']',
                });
                node.warn('Shelly type mismatch: ' + deviceType);
            }
        } else {
            node.status({ fill: 'red', shape: 'ring', text: 'Wrong node type. Please use ' + requiredNodeType });
            node.warn('Wrong node type. Please use ' + requiredNodeType);
        }
    } catch (error) {
        node.lastError = describeError(error);
        node.status({ fill: 'red', shape: 'ring', text: 'Ping: ' + node.lastError });
        if (node.verbose) {
            node.warn(error.message);
        }
    }

    return found;
}

// checks if the device is the configured one.
async function tryCheckDeviceType(node, types) {
    // A node whose hostname field is blank takes its address per message instead, so
    // there is nothing to check here: report it like start() does rather than issuing
    // a request to 'http://'.
    if (node.hostname === '') {
        node.status({ fill: 'red', shape: 'ring', text: 'Hostname not configured' });
        return false;
    }

    let success = false;
    const credentials = getCredentials(node);

    // (gen 2 return the same info for /rpc/Shelly.GetDeviceInfo)
    try {
        const shellyInfo = await shellyRequestAsync(node.axiosInstance, 'GET', '/shelly', null, null, credentials);
        node.lastError = undefined;

        let requiredNodeType;
        let deviceType;
        // Generation 1 devices
        if (shellyInfo.type) {
            deviceType = shellyInfo.type;
            requiredNodeType = 'shelly-gen1';
        } // Generation 2 devices
        else if (shellyInfo.model && shellyInfo.gen === 2) {
            deviceType = shellyInfo.model;
            requiredNodeType = 'shelly-gen2';
        } // Generation 3 devices
        else if (shellyInfo.model && shellyInfo.gen === 3) {
            deviceType = shellyInfo.model;
            requiredNodeType = 'shelly-gen2'; // right now the protocol is compatible to gen 2
        } // Generation 4 devices
        else if (shellyInfo.model && shellyInfo.gen === 4) {
            deviceType = shellyInfo.model;
            requiredNodeType = 'shelly-gen2'; // right now the protocol is compatible to gen 2
        } else {
            // this can not happen right now.
            requiredNodeType = 'shelly gen-type is not supported';
        }

        if (requiredNodeType === node.type) {
            let found = false;
            for (let i = 0; i < types.length; i++) {
                const type = types[i];

                if (deviceType) {
                    found = deviceType.startsWith(type);
                    if (found) {
                        break;
                    }
                }
            }

            if (found) {
                success = true;
                node.status({ fill: 'green', shape: 'ring', text: '' + deviceType });
            } else {
                node.status({ fill: 'red', shape: 'ring', text: 'Shelly type mismatch: ' + deviceType });
                node.warn(
                    'Shelly type mismatch: ' +
                        deviceType +
                        '. Choose correct type or if the device is not supported yet then report it here:' +
                        'https://github.com/windkh/node-red-contrib-shelly/issues'
                );
            }
        } else {
            node.status({ fill: 'red', shape: 'ring', text: 'Wrong node type. Please use ' + requiredNodeType });
            node.warn('Wrong node type. Please use ' + requiredNodeType);
        }
    } catch (error) {
        // The reason belongs in the status: this is the callback-mode path, where a
        // bare "Waiting for device..." made a name that does not resolve (ENOTFOUND)
        // look exactly like a wrong IP or a sleeping device. See #277.
        node.lastError = describeError(error);
        node.status({ fill: 'yellow', shape: 'ring', text: 'Waiting for device: ' + node.lastError });
        if (node.verbose) {
            node.warn(error.message);
        }
    }

    return success;
}

// Starts polling the status.
async function start(node, types) {
    if (node.hostname !== '') {
        const credentials = getCredentials(node);
        // Note: must await — otherwise node.online holds a Promise and the
        // first reachability transition is missed (Promise === true/false is never true).
        node.online = await shellyPing(node, credentials, types);

        if (node.pollInterval > 0) {
            node.pollingTimer = setInterval(async function () {
                if (node.closing) return;
                const found = await shellyPing(node, credentials, types);
                if (node.closing) return;
                if (found) {
                    if (node.online === false) {
                        node.status({ fill: 'green', shape: 'ring', text: 'Connected.' });
                    }

                    if (node.pollStatus) {
                        node.emit('input', {});
                    }
                } else {
                    if (node.online === true) {
                        node.status({ fill: 'yellow', shape: 'ring', text: 'Polling: device not reachable' });

                        const msg = {
                            error: {
                                hostname: node.hostname,
                                reason: node.lastError,
                                message:
                                    'Device is not reachable. Retrying to connect every ' +
                                    node.initializeRetryInterval / 1000 +
                                    ' seconds.',
                            },
                        };
                        node.send([msg]);
                    }
                }

                node.online = found;
            }, node.pollInterval);
        } else {
            node.status({ fill: 'yellow', shape: 'ring', text: 'Polling is turned off' });
        }
    } else {
        node.status({ fill: 'red', shape: 'ring', text: 'Hostname not configured' });
    }
}

async function startAsync(node, types) {
    start(node, types);
}

module.exports = {
    describeError,
    reportInitializationError,
    getIPAddress,
    getIPAddresses,
    getShellyInfo,
    shellyRequestAsync,
    getCredentials,
    shellyPing,
    tryCheckDeviceType,
    start,
    startAsync,
};
