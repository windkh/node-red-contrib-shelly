'use strict';

const axios = require('axios').default;

// A minimal Node-RED-shaped node mock for unit-testing the lifecycle
// functions in shelly/lib/shelly.js. Each call to status/warn/error/send
// is captured into a list on the returned harness so tests can assert on
// what the SUT tried to do.
function makeFakeNode(opts = {}) {
    const statuses = [];
    const warnings = [];
    const errors = [];
    const sends = [];

    const node = {
        type: opts.type || 'shelly-gen1',
        hostname: opts.hostname || '',
        pollInterval: opts.pollInterval !== undefined ? opts.pollInterval : 5000,
        pollStatus: opts.pollStatus || false,
        initializeRetryInterval: opts.initializeRetryInterval || 5000,
        verbose: opts.verbose || false,
        authType: opts.authType,
        credentials: { username: opts.username || '', password: opts.password || '' },
        axiosInstance: opts.axiosInstance || axios,
        status: (s) => statuses.push(s),
        warn: (m) => warnings.push(m),
        error: (m) => errors.push(m),
        send: (m) => sends.push(m),
        emit: () => {},
    };

    return { node, statuses, warnings, errors, sends };
}

module.exports = { makeFakeNode };
