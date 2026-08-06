const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// shelly/scripts/ble-shelly-blu.js runs on the device's mJS runtime, not on node, so it
// cannot be require()d. It is plain ES5-shaped source with no top-level side effect other
// than the init() call on its last line, so running it inside a Function with stubbed
// Shelly/BLE/console globals exercises exactly the path the device takes at script start.
//
// What matters here is that init() reaches BLE.Scanner.Subscribe: that subscription is the
// only route to the scan callback, which is the only caller of emitData, which is the only
// place the 'node-red-contrib-shelly-blu' event is emitted. No subscribe, no BLU events.
const scriptPath = path.join(__dirname, '..', '..', 'shelly', 'scripts', 'ble-shelly-blu.js');
const source = fs.readFileSync(scriptPath, 'utf8');

function runScript(bleConfig) {
    const calls = { subscribed: false, started: false, logs: [] };

    const shellyStub = {
        getComponentConfig: (component) => {
            assert.equal(component, 'ble');
            return bleConfig;
        },
        emitEvent: () => {},
    };

    const bleStub = {
        Scanner: {
            SCAN_RESULT: 'scan_result',
            INFINITE_SCAN: -1,
            isRunning: () => false,
            Start: () => {
                calls.started = true;
                return true;
            },
            Subscribe: () => {
                calls.subscribed = true;
            },
        },
    };

    const consoleStub = { log: (message) => calls.logs.push(message) };

    const run = new Function('Shelly', 'BLE', 'console', source);
    run(shellyStub, bleStub, consoleStub);

    return calls;
}

describe('ble-shelly-blu.js device script', () => {
    it('subscribes to the scanner on firmware < 2.0.0, where ble.enable is true', () => {
        const calls = runScript({ enable: true, rpc: { enable: true } });

        assert.equal(calls.subscribed, true);
        assert.equal(calls.started, true);
    });

    it('subscribes on firmware >= 2.0.0, where the ble.enable flag no longer exists', () => {
        // #261: 2.0.0 removed the global enable flag ("BLE: Remove global enable flag from
        // config (auto-activate/deactivate scanning) BREAKING CHANGE"). The upstream guard
        // read !BLEConfig.enable, so the missing flag aborted init() before Subscribe and no
        // BLU event ever reached node-red — while the script still reported itself running.
        const calls = runScript({ rpc: { enable: true } });

        assert.equal(calls.subscribed, true, 'must subscribe when the flag is simply absent');
        assert.deepEqual(calls.logs, []);
    });

    it('still refuses to run when bluetooth is explicitly disabled', () => {
        const calls = runScript({ enable: false, rpc: { enable: false } });

        assert.equal(calls.subscribed, false);
        assert.equal(calls.started, false);
        assert.ok(calls.logs.some((l) => /Bluetooth is not enabled/.test(l)));
    });

    it('does not throw when the device reports no ble config at all', () => {
        // The old guard dereferenced BLEConfig unconditionally and would have thrown here.
        const calls = runScript(null);

        assert.equal(calls.subscribed, true);
    });
});
