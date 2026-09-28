const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// shelly/scripts/callback.js runs on the device's mJS runtime, not on node, so it
// cannot be require()d. Its only top-level side effect is registering
// Shelly.addEventHandler, so running it inside a Function with stubbed Shelly/print
// globals — and returning the internal IsAllowedCallbackUrl function declaration —
// exercises the actual defense-in-depth check exactly as shipped, the same pattern
// used in ble-blu-script.test.js for the other vendored device script.
const scriptPath = path.join(__dirname, '..', '..', 'shelly', 'scripts', 'callback.js');
const source = fs.readFileSync(scriptPath, 'utf8');

function loadIsAllowedCallbackUrl() {
    const shellyStub = {
        addEventHandler: () => {},
        call: () => {},
    };
    const printStub = () => {};

    const run = new Function('Shelly', 'print', source + '\nreturn IsAllowedCallbackUrl;');
    return run(shellyStub, printStub);
}

describe('callback.js IsAllowedCallbackUrl (device-side defense-in-depth)', () => {
    const isAllowedCallbackUrl = loadIsAllowedCallbackUrl();

    it('rejects the cloud metadata endpoint', () => {
        assert.equal(isAllowedCallbackUrl('http://169.254.169.254:1880/callback'), false);
    });

    it('rejects IPv4 loopback', () => {
        assert.equal(isAllowedCallbackUrl('http://127.0.0.1:1880/callback'), false);
    });

    it('rejects the literal hostname localhost', () => {
        assert.equal(isAllowedCallbackUrl('http://localhost:1880/callback'), false);
    });

    it('rejects IPv6 loopback', () => {
        assert.equal(isAllowedCallbackUrl('http://[::1]:1880/callback'), false);
    });

    it('rejects non-http(s) schemes', () => {
        assert.equal(isAllowedCallbackUrl('ftp://192.168.1.1/callback'), false);
    });

    it('rejects non-string input', () => {
        assert.equal(isAllowedCallbackUrl(undefined), false);
    });

    it('accepts a private LAN address (the normal callback target)', () => {
        assert.equal(isAllowedCallbackUrl('http://192.168.1.10:1880/callback'), true);
    });

    it('accepts a public https callback URL', () => {
        assert.equal(isAllowedCallbackUrl('https://nodered.example.com:1880/callback'), true);
    });
});
