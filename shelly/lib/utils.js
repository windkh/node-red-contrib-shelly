const net = require('net');

function isMsgPayloadValid(msg) {
    let isValid = false;
    if (msg !== undefined && msg.payload !== undefined && !Array.isArray(msg)) {
        if (!Array.isArray(msg.payload) && !isEmpty(msg.payload)) {
            isValid = true;
        }
    }

    return isValid;
}

function isMsgPayloadValidOrArray(msg) {
    let isValid = false;
    if (msg !== undefined && msg.payload !== undefined && !Array.isArray(msg)) {
        if (!isEmpty(msg.payload)) {
            isValid = true;
        }
    }

    return isValid;
}

function isEmpty(obj) {
    return Object.keys(obj).length === 0;
}

function trim(str) {
    let result;
    if (str) {
        result = str.trim();
    }

    return result;
}

// Normalises what a user can reasonably paste into a hostname field. The value is
// concatenated into 'http://' + hostname, so the URL copied out of a browser's address
// bar ('http://shelly1-a4cf12.local/') would become 'http://http://shelly1-a4cf12.local/',
// in which the URL parser reads the host as 'http' — the "getaddrinfo ENOTFOUND http"
// of #277. Scheme, path and surrounding whitespace are dropped; a port is kept.
function trimHostname(str) {
    let result = trim(str);
    if (result) {
        result = result.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '');
        const pathStart = result.indexOf('/');
        if (pathStart !== -1) {
            result = result.slice(0, pathStart);
        }
    }

    return result;
}

function replace(str, pattern, replacement) {
    let result;
    if (str) {
        result = str.replace(pattern, replacement);
    }

    return result;
}

// Blocks destinations a callback should never legitimately target: loopback and
// link-local (which covers the AWS/Azure/GCP metadata IP 169.254.169.254).
// Private/LAN ranges (10/8, 172.16/12, 192.168/16, IPv6 ULA) are deliberately
// allowed, because the callback normally targets the Node-RED host on the LAN.
function isAllowedCallbackHost(rawHostname) {
    let allowed = true;
    let hostname = rawHostname;
    if (hostname.startsWith('[') && hostname.endsWith(']')) {
        hostname = hostname.slice(1, -1);
    }

    const ipVersion = net.isIP(hostname);
    if (hostname === 'localhost') {
        allowed = false;
    } else if (ipVersion === 4) {
        const octets = hostname.split('.').map(Number);
        allowed = octets[0] !== 127 && !(octets[0] === 169 && octets[1] === 254);
    } else if (ipVersion === 6) {
        const zoneFree = hostname.split('%')[0];
        allowed = zoneFree !== '::1' && !zoneFree.startsWith('fe80:');
    }

    return allowed;
}

// Validates a callback/webhook URL before it is provisioned to a device: this is
// the primary SSRF boundary (shelly/scripts/callback.js keeps a lightweight
// substring check too, as defense-in-depth on the device side).
function isAllowedCallbackUrl(url) {
    let allowed = false;
    if (typeof url === 'string' && url !== '') {
        try {
            const parsed = new URL(url);
            if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
                allowed = isAllowedCallbackHost(parsed.hostname.toLowerCase());
            }
        } catch {
            // not a well-formed absolute URL: leave allowed = false.
        }
    }

    return allowed;
}

module.exports = {
    isMsgPayloadValid,
    isMsgPayloadValidOrArray,
    isEmpty,
    trim,
    trimHostname,
    replace,
    isAllowedCallbackUrl,
};
