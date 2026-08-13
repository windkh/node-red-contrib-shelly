'use strict';

// v2 reports failures as { error: "<STRING>", data: { messages: [...] } } with documented
// codes such as DEVICE_OFFLINE, DEVICE_INVALID_MODE or BAD_REQUEST, and group calls add a
// failedCommands map. v1 had nothing comparable, and the node discarded the body either way,
// so a user saw only axios' generic status text and no reason.
function describeCloudErrorV2(error) {
    let description = error.message;

    const body = error.response ? error.response.data : undefined;
    if (body && body.error) {
        description = body.error;

        const messages = body.data ? body.data.messages : undefined;
        if (Array.isArray(messages) && messages.length > 0) {
            description += ': ' + messages.join('; ');
        }
    }

    return description;
}

module.exports = { describeCloudErrorV2 };
