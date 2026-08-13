'use strict';

const V1 = 'v1';
const V2 = 'v2';

// Resolves the configured cloud API version.
//
// Only an explicit 'v2' selects v2. Everything else — most importantly an absent value —
// resolves to v1, because absent can only mean "this config node was saved before the
// option existed". Reading absent as v2 would silently switch the API under every existing
// user on upgrade, and their payloads do not port (see ADR-011).
//
// The editor writes 'v2' into newly created config nodes, so new users get v2 without
// having to choose; this default lives in the html, not here.
function resolveApiVersion(configured) {
    let result = V1;

    if (configured === V2) {
        result = V2;
    }

    return result;
}

module.exports = { resolveApiVersion, V1, V2 };
