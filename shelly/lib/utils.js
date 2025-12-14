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
    replace,
};
