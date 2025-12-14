const utils = require('./utils.js');

let crypto = require('crypto');
// const crypto = require('node:crypto'); see #99 nodejs V19

const axios = require('axios').default;

let nonceCount = 1;

// gets all IP addresses: https://stackoverflow.com/questions/3653065/get-local-ip-address-in-node-js?page=2&tab=scoredesc#tab-top
function getIPAddresses() {
    let ipAddresses = [];

    let interfaces = require('os').networkInterfaces();
    for (let devName in interfaces) {
        let iface = interfaces[devName];
        for (let i = 0; i < iface.length; i++) {
            let alias = iface[i];
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
        let ipAddresses = getIPAddresses();
        if (ipAddresses !== undefined && ipAddresses.length > 0) {
            ipAddress = ipAddresses[0];
        } else {
            node.error('Could not detect local IP address: please configure hostname.');
        }
    }

    return ipAddress;
}

// Gets a header with the authorization property for the request.
function getHeaders(credentials) {
    let headers = {};

    if (credentials) {
        if (credentials.authType === 'Basic') {
            if (credentials.username && credentials.password) {
                // Authorization is case sensitive for some devices like the TRV!
                headers.Authorization = 'Basic ' + Buffer.from(credentials.username + ':' + credentials.password).toString('base64');
            }
        }
    }

    return headers;
}

// Encrypts a string using SHA-256.
function sha256(str) {
    let result = crypto.createHash('sha256').update(str).digest('hex');
    return result;
}

// see https://shelly-api-docs.shelly.cloud/gen2/General/Authentication
// see https://github.com/axios/axios/issues/686
function getDigestAuthorization(response, credentials, config) {
    let authDetails = response.headers['www-authenticate'].split(', ');
    let propertiesArray = authDetails.map((v) => v.split('='));
    let properties = new Map(propertiesArray.map((obj) => [obj[0], obj[1]]));

    nonceCount++; // global counter
    let url = config.url;
    let method = config.method;

    // let algorithm = properties.get('algorithm'); // TODO: check if it is still SHA-256
    let username = credentials.username;
    let password = credentials.password;
    let realm = utils.replace(properties.get('realm'), /"/g, '');
    let authParts = [username, realm, password];

    let ha1String = authParts.join(':');
    let ha1 = sha256(ha1String);
    let ha2String = method + ':' + url;
    let ha2 = sha256(ha2String);
    let nc = ('00000000' + nonceCount).slice(-8);
    let nonce = utils.replace(properties.get('nonce'), /"/g, '');
    let cnonce = crypto.randomBytes(24).toString('hex');
    let responseString = ha1 + ':' + nonce + ':' + nc + ':' + cnonce + ':' + 'auth' + ':' + ha2;
    let responseHash = sha256(responseString);

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
        timeout = 5003;
    }

    // We avoid an invalid timeout by taking a default if 0.
    let requestTimeout = timeout;
    if (requestTimeout <= 0) {
        requestTimeout = 5004;
    }

    let headers = getHeaders(credentials);

    let baseUrl = 'http://' + credentials.hostname;
    let config = {
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

    return result;
}

// checks if the device is reachable and returns the shelly info. Note that /shelly does not require any credentials.
async function getShellyInfo(hostname) {
    let shellyInfo;

    // (gen 2 return the same info for /rpc/Shelly.GetDeviceInfo)
    try {
        let credentials = {
            hostname: hostname,
        };
        shellyInfo = await shellyRequestAsync(axios, 'GET', '/shelly', null, null, credentials);
    } catch (error) {
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
        hostname = msg.payload.hostname;
        username = msg.payload.username;
        password = msg.payload.password;
    }

    if (hostname === undefined) {
        hostname = node.hostname;
    }

    if (username === undefined) {
        username = node.credentials.username;
    }

    if (password === undefined) {
        password = node.credentials.password;
    }

    let authType = node.authType;
    if (authType === 'Digest') {
        username = 'admin'; // see https://shelly-api-docs.shelly.cloud/gen2/General/Authentication
    }

    let credentials = {
        hostname: hostname,
        authType: authType,
        username: username,
        password: password,
    };

    return credentials;
}

// Hint: the /shelly route can be accessed without authorization
async function shellyPing(node, credentials, types) {
    // gen 1 and gen 2 devices support this endpoint (gen 2 return the same info for /rpc/Shelly.GetDeviceInfo)
    try {
        let data;
        let params;
        let body = await shellyRequestAsync(node.axiosInstance, 'GET', '/shelly', params, data, credentials, node.pollInterval);

        node.shellyInfo = body;

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
            let found = false;
            for (let i = 0; i < types.length; i++) {
                let type = types[i];

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
                node.status({ fill: 'red', shape: 'ring', text: 'Shelly type mismatch: ' + deviceType + ' not found in [' + types.join(',') + ']' });
                node.warn('Shelly type mismatch: ' + deviceType);
            }
        } else {
            node.status({ fill: 'red', shape: 'ring', text: 'Wrong node type. Please use ' + requiredNodeType });
            node.warn('Wrong node type. Please use ' + requiredNodeType);
        }
    } catch (error) {
        node.status({ fill: 'red', shape: 'ring', text: 'Ping: ' + error.message });
        if (node.verbose) {
            node.warn(error.message);
        }
    }
}

// checks if the device is the configured one.
async function tryCheckDeviceType(node, types) {
    let success = false;
    let credentials = getCredentials(node);

    // (gen 2 return the same info for /rpc/Shelly.GetDeviceInfo)
    try {
        let shellyInfo = await shellyRequestAsync(node.axiosInstance, 'GET', '/shelly', null, null, credentials);

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
                let type = types[i];

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
        node.status({ fill: 'yellow', shape: 'ring', text: 'Waiting for device...' });
        if (node.verbose) {
            node.warn(error.message);
        }
    }

    return success;
}

// Starts polling the status.
function start(node, types) {
    if (node.hostname !== '') {
        let credentials = getCredentials(node);
        shellyPing(node, credentials, types);

        if (node.pollInterval > 0) {
            node.pollingTimer = setInterval(function () {
                shellyPing(node, credentials, types);

                if (node.pollStatus) {
                    node.emit('input', {});
                }
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
