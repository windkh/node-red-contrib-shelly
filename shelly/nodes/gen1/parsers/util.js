'use strict';

// Joins a base path and a parameter string. Strips a stray leading '&' from
// parameters so callers can build them with `+= '&key=value'` unconditionally.
function combineUrl(path, parameters) {
    let route = path + '?';

    if (parameters.charAt(0) === '&') {
        parameters = parameters.substring(1);
    }

    route += parameters;
    return route;
}

module.exports = { combineUrl };
