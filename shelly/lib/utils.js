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

module.exports = {
    isMsgPayloadValid,
    isMsgPayloadValidOrArray,
    isEmpty,
    trim,
    trimHostname,
    replace,
};
