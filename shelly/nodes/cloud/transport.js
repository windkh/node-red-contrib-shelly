'use strict';

const axios = require('axios').default;

const rateLimit = require('axios-rate-limit');

const { describeCloudErrorV2 } = require('./errors.js');

// One rate-limited instance shared by every cloud node in the process — the cloud caps
// requests at 1/s per account and answers an overrun with a misleading 401 (ADR-005).
// Module level rather than per-node: `require` caches this module, so all cloud nodes queue
// through the same limiter.
const cloudAxios = rateLimit(axios.create(), { maxRequests: 1, perMilliseconds: 1000, maxRPS: 1 });

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

module.exports = { shellyCloudRequestAsync, shellyCloudRequestV2Async, getRequestTimeout };
