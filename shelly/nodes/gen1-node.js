module.exports = function (RED) {
    'use strict';

    const utils = require('../lib/utils.js');
    const shelly = require('../lib/shelly.js');
    const configuration = require('../lib/configuration.js');

    const axios = require('axios').default;

    function combineUrl(path, parameters) {
        let route = path + '?';

        if (parameters.charAt(0) === '&') {
            parameters = parameters.substring(1);
        }

        route += parameters;
        return route;
    }

    // Creates a route from the input.
    async function inputParserRelay1Async(msg) {
        let route;
        if (utils.isMsgPayloadValid(msg)) {
            let command = msg.payload;

            let relay = 0;
            if (command.relay !== undefined) {
                relay = command.relay;
            }

            let turn;
            if (command.on !== undefined) {
                if (command.on == true) {
                    turn = 'on';
                } else {
                    turn = 'off';
                }
            } else if (command.turn !== undefined) {
                turn = command.turn;
            }

            let timerSeconds;
            if (command.timer !== undefined) {
                timerSeconds = command.timer;
            }

            let parameters = '';
            if (turn !== undefined) {
                parameters += '&turn=' + turn;
            }

            if (timerSeconds !== undefined) {
                parameters += '&timer=' + timerSeconds;
            }

            if (parameters !== '') {
                route = combineUrl('/relay/' + relay, parameters);
            }
        }
        return route;
    }

    // Creates a route from the input.
    async function inputParserMeasure1Async(msg, node, credentials) {
        let route;
        if (utils.isMsgPayloadValid(msg)) {
            let command = msg.payload;

            let relay = 0;
            if (command.relay !== undefined) {
                relay = command.relay;
            }

            let turn;
            if (command.on !== undefined) {
                if (command.on == true) {
                    turn = 'on';
                } else {
                    turn = 'off';
                }
            } else if (command.turn !== undefined) {
                turn = command.turn;
            }

            let timerSeconds;
            if (command.timer !== undefined) {
                timerSeconds = command.timer;
            }

            let parameters = '';
            if (turn !== undefined) {
                parameters += '&turn=' + turn;
            }

            if (timerSeconds !== undefined) {
                parameters += '&timer=' + timerSeconds;
            }

            if (parameters !== '') {
                route = combineUrl('/relay/' + relay, parameters);
            }

            // Download EM data if required.
            let emetersToDownload;
            if (command.download !== undefined) {
                emetersToDownload = command.download;
            }

            // special download code for EM devices that can store historical data.
            if (emetersToDownload) {
                let data = [];
                for (let i = 0; i < emetersToDownload.length; i++) {
                    let emeter = emetersToDownload[i];
                    let downloadRoute = '/emeter/' + emeter + '/em_data.csv';

                    node.status({ fill: 'green', shape: 'ring', text: 'Downloading CSV ' + emeter });

                    try {
                        let timeout = 60000; // download can take very long of there is a lot of data.
                        let body = await shelly.shellyRequestAsync(node.axiosInstance, 'GET', downloadRoute, null, null, credentials, timeout);
                        data.push(body);
                    } catch (error) {
                        node.error('Downloading CSV failed ' + emeter, error);
                        node.status({ fill: 'red', shape: 'ring', text: 'Downloading CSV failed ' + emeter });
                        node.warn('Downloading CSV failed ' + emeter);
                    }
                }

                node.status({ fill: 'green', shape: 'ring', text: 'Connected.' });

                msg.payload = data;
                node.send([null, msg]);
            }
        }

        return route;
    }

    // Creates a route from the input.
    async function inputParserRoller1Async(msg) {
        let route;
        if (utils.isMsgPayloadValid(msg)) {
            let command = msg.payload;

            let roller = 0;
            if (command.roller !== undefined) {
                roller = command.roller;
            }

            let go;
            if (command.go !== undefined) {
                go = command.go;

                if (command.go == 'to_pos' && command.roller_pos !== undefined) {
                    go += '&roller_pos=' + command.roller_pos;
                }
            }

            if (go !== undefined) {
                route = '/roller/' + roller + '?go=' + go;
            }

            // we fall back to relay mode if no valid roller command is received.
            if (route === undefined) {
                let relay = 0;
                if (command.relay !== undefined) {
                    relay = command.relay;
                }

                let turn;
                if (command.on !== undefined) {
                    if (command.on == true) {
                        turn = 'on';
                    } else {
                        turn = 'off';
                    }
                } else if (command.turn !== undefined) {
                    turn = command.turn;
                }

                if (turn !== undefined) {
                    route = '/relay/' + relay + '?turn=' + turn;
                }
            }
        }
        return route;
    }

    // Creates a route from the input.
    async function inputParserDimmer1Async(msg) {
        let route;
        if (utils.isMsgPayloadValid(msg)) {
            let command = msg.payload;

            let light = 0;
            if (command.light !== undefined) {
                light = command.light;
            }

            let turn;
            if (command.on !== undefined) {
                if (command.on == true) {
                    turn = 'on';
                } else {
                    turn = 'off';
                }
            } else if (command.turn !== undefined) {
                turn = command.turn;
            } else {
                // turn is undefined
            }

            let brightness;
            if (command.brightness !== undefined) {
                if (command.brightness >= 1 && command.brightness <= 100) {
                    brightness = command.brightness;
                } else {
                    brightness = 100; // Default to full brightness
                }
            }

            let white;
            if (command.white !== undefined) {
                if (command.white >= 1 && command.white <= 100) {
                    white = command.white;
                } else {
                    // Default is undefined
                }
            }

            let temperature;
            if (command.temp !== undefined) {
                if (command.temp >= 2700 && command.temp <= 6500) {
                    temperature = command.temp;
                } else {
                    // Default is undefined
                }
            }

            let transition;
            if (command.transition !== undefined) {
                if (command.transition >= 0 && command.transition <= 5000) {
                    transition = command.transition;
                } else {
                    // Default is undefined
                }
            }

            let timer;
            if (command.timer !== undefined) {
                if (command.timer >= 0) {
                    timer = command.timer;
                } else {
                    // Default is undefined
                }
            }

            let dim;
            if (command.dim !== undefined) {
                dim = command.dim;
            }

            let step;
            if (command.step !== undefined) {
                step = command.step;
            }

            let parameters = '';
            if (turn !== undefined) {
                parameters += '&turn=' + turn;
            }

            if (brightness !== undefined) {
                parameters += '&brightness=' + brightness;
            }

            if (white !== undefined) {
                parameters += '&white=' + white;
            }

            if (temperature !== undefined) {
                parameters += '&temp=' + temperature;
            }

            if (transition !== undefined) {
                parameters += '&transition=' + transition;
            }

            if (timer !== undefined) {
                parameters += '&timer=' + timer;
            }

            if (step !== undefined) {
                parameters += '&step=' + step;
            }

            if (dim !== undefined) {
                parameters += '&dim=' + dim;
            }

            if (parameters !== '') {
                route = combineUrl('/light/' + light, parameters);
            }
        }
        return route;
    }

    // Creates a route from the input.
    async function inputParserThermostat1Async(msg) {
        let route;
        if (utils.isMsgPayloadValid(msg)) {
            let command = msg.payload;

            let thermostat = 0;

            let position;
            if (command.position !== undefined) {
                if (command.position >= 0 && command.position <= 100) {
                    position = command.position;
                } else {
                    // Default is undefined
                }
            }

            let temperature;
            if (command.temperature !== undefined) {
                if (command.temperature >= 4 && command.temperature <= 31) {
                    temperature = command.temperature;
                } else {
                    // Default is undefined
                }
            }

            let schedule;
            if (command.schedule !== undefined) {
                if (command.schedule == true || command.schedule == false) {
                    schedule = command.schedule;
                }
            }

            let scheduleProfile;
            if (command.scheduleProfile !== undefined) {
                if (command.scheduleProfile >= 1 || command.scheduleProfile <= 5) {
                    scheduleProfile = command.scheduleProfile;
                }
            }

            let boostMinutes;
            if (command.boostMinutes !== undefined) {
                if (command.boostMinutes >= 0) {
                    boostMinutes = command.boostMinutes;
                }
            }

            let parameters = '';
            if (position !== undefined) {
                parameters = '&pos=' + position;
            }

            if (temperature !== undefined) {
                parameters += '&target_t=' + temperature;
            }

            if (schedule !== undefined) {
                parameters += '&schedule=' + schedule;
            }

            if (scheduleProfile !== undefined) {
                parameters += '&schedule_profile=' + scheduleProfile;
            }

            if (boostMinutes !== undefined) {
                parameters += '&boost_minutes=' + boostMinutes;
            }

            if (parameters !== '') {
                route = combineUrl('/thermostat/' + thermostat, parameters);
            }
        }
        return route;
    }

    // Creates a route from the input.
    async function inputParserSensor1Async(msg) {
        let route;
        if (utils.isMsgPayloadValid(msg)) {
            // right now sensors do not accept input commands.
        }
        return route;
    }

    // Creates a route from the input.
    async function inputParserButton1Async(msg) {
        let route;
        if (utils.isMsgPayloadValid(msg)) {
            let command = msg.payload;

            let input = 0;
            if (command.input !== undefined) {
                input = command.input;
            }

            let event = 'S';
            if (command.event !== undefined) {
                event = command.event;
            }

            let eventCount;
            if (command.eventCount !== undefined) {
                eventCount = command.eventCount;
            }

            let parameters = '';
            if (event !== undefined) {
                parameters = '&event=' + event;
            }

            if (eventCount !== undefined) {
                parameters += '&event_cnt=' + eventCount;
            }

            if (parameters !== '') {
                route = combineUrl('/input/' + input, parameters);
            }
        }
        return route;
    }

    // Creates a route from the input.
    async function inputParserRGBW1Async(msg, node /*, credentials */) {
        let route;
        if (utils.isMsgPayloadValid(msg)) {
            let command = msg.payload;

            let nodeMode = node.rgbwMode;
            if (nodeMode === 'color') {
                let red;
                if (command.red !== undefined) {
                    if (command.red >= 0 && command.red <= 255) {
                        red = command.red;
                    } else {
                        red = 255; // Default to full brightness
                    }
                }

                let green;
                if (command.green !== undefined) {
                    if (command.green >= 0 && command.green <= 255) {
                        green = command.green;
                    } else {
                        green = 255; // Default to full brightness
                    }
                }

                let blue;
                if (command.blue !== undefined) {
                    if (command.blue >= 0 && command.blue <= 255) {
                        blue = command.blue;
                    } else {
                        blue = 255; // Default to full brightness
                    }
                }

                let white;
                if (command.white !== undefined) {
                    if (command.white >= 0 && command.white <= 255) {
                        white = command.white;
                    } else {
                        white = 255; // Default to full brightness
                    }
                }

                let temperature;
                if (command.temp !== undefined) {
                    if (command.temp >= 3000 && command.temp <= 6500) {
                        temperature = command.temp;
                    } else {
                        // Default is undefined
                    }
                }

                let gain;
                if (command.gain !== undefined) {
                    if (command.gain >= 0 && command.gain <= 100) {
                        gain = command.gain;
                    } else {
                        gain = 100; // Default to full gain
                    }
                }

                let brightness;
                if (command.brightness !== undefined) {
                    if (command.brightness >= 0 && command.brightness <= 100) {
                        brightness = command.brightness;
                    } else {
                        // Default to undefined
                    }
                }

                let effect;
                if (command.effect !== undefined) {
                    if (command.effect >= 0) {
                        effect = command.effect;
                    } else {
                        effect = 0; // Default to no effect
                    }
                }

                let transition;
                if (command.transition !== undefined) {
                    if (command.transition >= 0 && command.transition <= 5000) {
                        transition = command.transition;
                    } else {
                        // Default is undefined
                    }
                }

                let timer;
                if (command.timer !== undefined) {
                    if (command.timer >= 0) {
                        timer = command.timer;
                    } else {
                        timer = 0; // Default to no timer
                    }
                }

                let turn;
                if (command.on !== undefined) {
                    if (command.on == true) {
                        turn = 'on';
                    } else {
                        turn = 'off';
                    }
                } else if (command.turn !== undefined) {
                    turn = command.turn;
                } else {
                    turn = 'on';
                }

                // create route
                route = '/color/0?turn=' + turn;

                if (gain !== undefined) {
                    route += '&gain=' + gain;
                }

                if (red !== undefined) {
                    route += '&red=' + red;
                }

                if (green !== undefined) {
                    route += '&green=' + green;
                }

                if (blue !== undefined) {
                    route += '&blue=' + blue;
                }

                if (white !== undefined) {
                    route += '&white=' + white;
                }

                if (temperature !== undefined) {
                    route += '&temp=' + temperature;
                }

                if (brightness !== undefined) {
                    route += '&brightness=' + brightness;
                }

                if (effect !== undefined) {
                    route += '&effect=' + effect;
                }

                if (transition !== undefined) {
                    route += '&transition=' + transition;
                }

                if (timer !== undefined && timer > 0) {
                    route += '&timer=' + timer;
                }
            } else if (nodeMode === 'white') {
                let light = 0;
                if (command.light !== undefined) {
                    if (command.light >= 0) {
                        light = command.light;
                    } else {
                        light = 0; // Default to no 0
                    }
                }

                let brightness;
                if (command.brightness !== undefined) {
                    if (command.brightness >= 0 && command.brightness <= 100) {
                        brightness = command.brightness;
                    } else {
                        brightness = 100; // Default to full brightness
                    }
                }

                let temperature;
                if (command.temp !== undefined) {
                    if (command.temp >= 3000 && command.temp <= 6500) {
                        temperature = command.temp;
                    } else {
                        // Default is undefined
                    }
                }

                let transition;
                if (command.transition !== undefined) {
                    if (command.transition >= 0 && command.transition <= 5000) {
                        transition = command.transition;
                    } else {
                        // Default is undefined
                    }
                }

                let timer;
                if (command.timer !== undefined) {
                    if (command.timer >= 0) {
                        timer = command.timer;
                    } else {
                        timer = 0; // Default to no timer
                    }
                }

                let turn;
                if (command.on !== undefined) {
                    if (command.on == true) {
                        turn = 'on';
                    } else {
                        turn = 'off';
                    }
                } else if (command.turn !== undefined) {
                    turn = command.turn;
                } else {
                    turn = 'on';
                }

                // create route
                route = '/white/' + light + '?turn=' + turn;

                if (brightness !== undefined) {
                    route += '&brightness=' + brightness;
                }

                if (temperature !== undefined) {
                    route += '&temp=' + temperature;
                }

                if (transition !== undefined) {
                    route += '&transition=' + transition;
                }

                if (timer !== undefined && timer > 0) {
                    route += '&timer=' + timer;
                }
            } else {
                // node mode Auto or None
            }
        }
        return route;
    }

    //  no operation function
    function inputParserEmpty1() {}

    // Returns the input parser for the device type.
    function getInputParser1(deviceType) {
        let result;

        switch (deviceType) {
            case 'Relay':
                result = inputParserRelay1Async;
                break;
            case 'Measure':
                result = inputParserMeasure1Async;
                break;
            case 'Roller':
                result = inputParserRoller1Async;
                break;
            case 'Dimmer':
                result = inputParserDimmer1Async;
                break;
            case 'Thermostat':
                result = inputParserThermostat1Async;
                break;
            case 'Sensor':
                result = inputParserSensor1Async;
                break;
            case 'Button':
                result = inputParserButton1Async;
                break;
            case 'RGBW':
                result = inputParserRGBW1Async;
                break;
            default:
                result = inputParserEmpty1;
                break;
        }
        return result;
    }

    // initializes a RGBW node.
    async function initializerRGBW1Async(node, types) {
        let success = false;

        let checkOK = await shelly.tryCheckDeviceType(node, types);
        if (checkOK === true) {
            try {
                let credentials = shelly.getCredentials(node);

                let settingsRoute = '/settings';
                let settings = await shelly.shellyRequestAsync(node.axiosInstance, 'GET', settingsRoute, null, null, credentials);

                node.rgbwMode = settings.mode;

                success = initializer1WebhookAsync(node, types);
            } catch (error) {
                node.status({ fill: 'red', shape: 'ring', text: 'Failed to get mode from settings.' });
                node.warn('Failed to get mode from settings. ' + error);
            }
        }

        return success;
    }

    async function initializer1(node, types) {
        let success = false;

        let checkOK = await shelly.tryCheckDeviceType(node, types);
        if (checkOK === true) {
            let mode = node.mode;
            if (mode === 'polling') {
                shelly.start(node, types);
                success = true;
            } else if (mode === 'callback') {
                node.error('Callback not supported for this type of device.');
                node.status({ fill: 'red', shape: 'ring', text: 'Callback not supported' });
            } else {
                // nothing to do.
                success = true;
            }
        }
        return success;
    }

    // starts polling or installs a webhook that calls a REST callback.
    async function initializer1WebhookAsync(node, types) {
        let success = false;

        let checkOK = await shelly.tryCheckDeviceType(node, types);
        if (checkOK === true) {
            const sender = node.hostname;
            await tryUninstallWebhook1Async(node, sender); // we ignore if it failed

            let mode = node.mode;
            if (mode === 'polling') {
                await shelly.startAsync(node, types);
                success = true;
            } else if (mode === 'callback') {
                let ipAddress = shelly.getIPAddress(node);
                let webhookUrl = 'http://' + ipAddress + ':' + node.server.port + '/webhook';
                success = await tryInstallWebhook1Async(node, webhookUrl, sender);
            } else {
                // nothing to do.
                success = true;
            }
        }

        return success;
    }

    // Installs a webhook.
    async function tryInstallWebhook1Async(node, webhookUrl, sender) {
        let success = false;
        if (node.hostname !== '') {
            node.status({ fill: 'yellow', shape: 'ring', text: 'Installing webhook...' });

            let credentials = shelly.getCredentials(node);

            let hookTypes = getHookTypes1(node.deviceType);

            // delete http://192.168.33.1/settings/actions?index=0&name=report_url&urls[]=
            // create http://192.168.33.1/settings/actions?index=0&name=report_url&enabled=true&urls[]=http://192.168.1.4/webhook
            try {
                if (hookTypes[0] && hookTypes[0].action === '*') {
                    hookTypes = await getHookTypesFromDevice1(node);
                }

                if (hookTypes.length !== 0) {
                    for (let i = 0; i < hookTypes.length; i++) {
                        let hookType = hookTypes[i];
                        let name = hookType.action;
                        let index = hookType.index;

                        let url = webhookUrl + '?data=' + name + '?' + index + '?' + sender; // note that & can not be used in gen1!!!
                        let deleteRoute = '/settings/actions?index=' + index + '&name=' + name + '&enabled=false&urls[]=';
                        try {
                            let timeout = node.pollInterval;
                            let deleteResult = await shelly.shellyRequestAsync(node.axiosInstance, 'GET', deleteRoute, null, null, credentials, timeout);
                            let actionsAfterDelete = deleteResult.actions[name][0];
                            if (actionsAfterDelete.enabled === false) {
                                // 1st try to set the action using the standard method
                                let createRoute = '/settings/actions?index=' + index + '&name=' + name + '&enabled=true&urls[]=' + url;
                                let createResult = await shelly.shellyRequestAsync(node.axiosInstance, 'GET', createRoute, null, null, credentials, timeout);
                                let actionsAfterCreate = createResult.actions[name][0];

                                if (actionsAfterCreate.enabled === true && actionsAfterCreate.urls.indexOf(url) > -1) {
                                    node.status({ fill: 'green', shape: 'ring', text: 'Connected.' });
                                    success = true;
                                } else {
                                    // 2nd: maybe the device supports intervals
                                    let createRoute2 =
                                        '/settings/actions?index=' + index + '&name=' + name + '&enabled=true&urls[0][url]=' + url + '&urls[0][int]=0000-0000';
                                    let createResult2 = await shelly.shellyRequestAsync(
                                        node.axiosInstance,
                                        'GET',
                                        createRoute2,
                                        null,
                                        null,
                                        credentials,
                                        timeout
                                    );
                                    let actionsAfterCreate2 = createResult2.actions[name][0];
                                    if (actionsAfterCreate2.enabled === true) {
                                        if (actionsAfterCreate2.urls[0].url === url) {
                                            node.status({ fill: 'green', shape: 'ring', text: 'Connected.' });
                                            success = true;
                                        } else {
                                            console.warn('Failed to install webhook ' + name + ' for ' + sender);
                                            success = false;
                                            break;
                                        }
                                    } else {
                                        console.warn('Failed to install webhook ' + name + ' for ' + sender);
                                        success = false;
                                        break;
                                    }
                                }
                            } else {
                                console.warn('Failed to delete webhook ' + name + ' for ' + sender);
                                success = false;
                                break;
                            }
                        } catch (error) {
                            node.status({ fill: 'yellow', shape: 'ring', text: 'Installing webhook....' });
                        }
                    }
                } else {
                    node.status({ fill: 'red', shape: 'ring', text: 'Device does not support callbacks' });
                    node.warn('Installing webhook failed (' + sender + ') ' + 'hooktypes are empty!');
                }
            } catch (error) {
                if (node.verbose) {
                    node.warn('Installing webhook failed (' + sender + ') ' + error);
                    // node.status({ fill: "red", shape: "ring", text: "Installing webhook failed "});
                }
            }
        } else {
            node.status({ fill: 'red', shape: 'ring', text: 'Hostname not configured' });
        }

        return success;
    }

    // Uninstalls a webhook.
    async function tryUninstallWebhook1Async(node, sender) {
        let success = false;
        if (node.hostname !== '') {
            // node.status({ fill: "yellow", shape: "ring", text: "Uninstalling webhook..." });

            let credentials = shelly.getCredentials(node);

            let hookTypes = getHookTypes1(node.deviceType);

            // delete http://192.168.33.1/settings/actions?index=0&name=report_url&urls[]=
            try {
                if (hookTypes[0] && hookTypes[0].action === '*') {
                    hookTypes = await getHookTypesFromDevice1(node);
                }

                if (hookTypes.length !== 0) {
                    for (let i = 0; i < hookTypes.length; i++) {
                        let hookType = hookTypes[i];
                        let name = hookType.action;
                        let index = hookType.index;
                        let urls = hookType.urls;

                        // We only delete the hook from us: find the sender url in the hook url.
                        for (let j = 0; j < urls.length; j++) {
                            let url = urls[i];

                            // This is a vage assumption but it is the best we have at the moment to identify our hooks.
                            if (url.includes(sender)) {
                                let deleteRoute = '/settings/actions?index=' + index + '&name=' + name + '&enabled=false&urls[]=';
                                try {
                                    let timeout = node.pollInterval;
                                    let deleteResult = await shelly.shellyRequestAsync(
                                        node.axiosInstance,
                                        'GET',
                                        deleteRoute,
                                        null,
                                        null,
                                        credentials,
                                        timeout
                                    );
                                    let actionsAfterDelete = deleteResult.actions[name][0];
                                    if (actionsAfterDelete.enabled === false) {
                                        // failed
                                    } else {
                                        console.warn('Failed to delete webhook ' + name + ' for ' + sender);
                                        success = false;
                                        break;
                                    }
                                } catch (error) {
                                    if (node.verbose) {
                                        node.warn('Uninstalling webhook failed (' + sender + ') ' + error);
                                        // node.status({ fill: "yellow", shape: "ring", text: "Uninstalling webhook...." });
                                    }
                                }
                            }
                        }
                    }
                } else {
                    node.status({ fill: 'red', shape: 'ring', text: 'Device does not support callbacks' });
                    node.warn('Installing webhook failed (' + sender + ') ' + 'hooktypes are empty!');
                }
            } catch (error) {
                if (node.verbose) {
                    node.warn('Installing webhook failed (' + sender + ') ' + error);
                    // node.status({ fill: "red", shape: "ring", text: "Uninstalling webhook failed "});
                }
            }
        } else {
            node.status({ fill: 'red', shape: 'ring', text: 'Hostname not configured' });
        }

        return success;
    }

    // Gets a function that initialize the device.
    function getInitializer1(deviceType) {
        let result;

        switch (deviceType) {
            case 'RGBW':
                result = initializerRGBW1Async;
                break;
            case 'Measure':
            case 'Roller':
            case 'Dimmer':
            case 'Sensor':
            case 'Thermostat':
            case 'Button':
            case 'Relay':
                result = initializer1WebhookAsync;
                break;
            default:
                result = initializer1;
                break;
        }
        return result;
    }

    // Returns a status object with filtered properties.
    function convertStatus1(status) {
        let result = {};

        if (status.relays !== undefined) {
            result.relays = status.relays;
        }

        if (status.rollers !== undefined) {
            result.rollers = status.rollers;
        }

        if (status.lights !== undefined) {
            result.lights = status.lights;
        }

        if (status.thermostats !== undefined) {
            result.thermostats = status.thermostats;
        }

        if (status.meters !== undefined) {
            result.meters = status.meters;
        }

        if (status.emeters !== undefined) {
            result.emeters = status.emeters;
        }

        if (status.inputs !== undefined) {
            result.inputs = status.inputs;
        }

        if (status.adcs !== undefined) {
            result.adcs = status.adcs;
        }

        if (status.sensor !== undefined) {
            result.sensor = status.sensor;
        }

        if (status.lux !== undefined) {
            result.lux = status.lux;
        }

        if (status.bat !== undefined) {
            result.bat = status.bat;
        }

        if (status.tmp !== undefined) {
            result.tmp = status.tmp;
        }

        if (status.hum !== undefined) {
            result.hum = status.hum;
        }

        if (status.smoke !== undefined) {
            result.smoke = status.smoke;
        }

        if (status.flood !== undefined) {
            result.flood = status.flood;
        }

        if (status.accel !== undefined) {
            result.accel = status.accel;
        }

        if (status.concentration !== undefined) {
            result.concentration = status.concentration;
        }

        if (status.ext_temperature !== undefined && !utils.isEmpty(status.ext_temperature)) {
            if (result.ext === undefined) {
                result.ext = {};
            }
            result.ext.temperature = status.ext_temperature;
        }

        if (status.ext_humidity !== undefined && !utils.isEmpty(status.ext_humidity)) {
            if (result.ext === undefined) {
                result.ext = {};
            }
            result.ext.humidity = status.ext_humidity;
        }

        return result;
    }

    let gen1HookTypes = new Map([
        ['Relay', [{ action: '*', index: 0 }]],
        ['Measure', [{ action: '*', index: 0 }]],
        ['Roller', [{ action: '*', index: 0 }]],
        ['Dimmer', [{ action: '*', index: 0 }]],
        ['Thermostat', [{ action: '*', index: 0 }]],
        ['Sensor', [{ action: '*', index: 0 }]],
        ['Button', [{ action: '*', index: 0 }]],
        ['RGBW', [{ action: '*', index: 0 }]],
    ]);

    function getHookTypes1(deviceType) {
        let hookTypes = gen1HookTypes.get(deviceType);
        if (hookTypes === undefined) {
            hookTypes = [];
        }

        return hookTypes;
    }

    async function getHookTypesFromDevice1(node) {
        let credentials = shelly.getCredentials(node);

        let actionsRoute = '/settings/actions';
        let result = await shelly.shellyRequestAsync(node.axiosInstance, 'GET', actionsRoute, null, null, credentials);

        let hookTypes = [];
        let actions = Object.keys(result.actions);
        for (let i = 0; i < actions.length; i++) {
            let action = actions[i];
            let actionItems = result.actions[action];
            for (let j = 0; j < actionItems.length; j++) {
                let item = actionItems[j];
                let index = item.index;

                let hookType = {
                    action: action,
                    index: index,
                    urls: item.urls,
                };
                hookTypes.push(hookType);
            }
        }

        return hookTypes;
    }

    async function executeCommand1(msg, route, node, credentials) {
        let getStatusRoute = '/status';
        if (route && route !== '') {
            try {
                let data;
                let params;
                let body = await shelly.shellyRequestAsync(node.axiosInstance, 'GET', route, params, data, credentials, 5010);

                if (node.getStatusOnCommand) {
                    try {
                        let data;
                        let params;

                        let body = await shelly.shellyRequestAsync(node.axiosInstance, 'GET', getStatusRoute, params, data, credentials, 5011);
                        node.status({ fill: 'green', shape: 'ring', text: 'Connected.' });

                        let status = body;
                        msg.status = status;
                        msg.payload = convertStatus1(status);
                        node.send([msg]);
                    } catch (error) {
                        if (msg.payload) {
                            node.status({ fill: 'yellow', shape: 'ring', text: error.message });
                            node.warn(error.message);
                        } else {
                            node.status({ fill: 'red', shape: 'ring', text: 'Error: ' + error });
                            node.warn('Error in executeCommand1: ' + route + '  --> ' + error);
                        }
                    }
                } else {
                    node.status({ fill: 'green', shape: 'ring', text: 'Connected.' });

                    msg.payload = body;
                    node.send([msg]);
                }
            } catch (error) {
                node.status({ fill: 'red', shape: 'ring', text: 'Error: ' + error });
                node.warn('Error in executeCommand1: ' + route + '  --> ' + error);

                // node.status({ fill: "yellow", shape: "ring", text: error.message });
                // node.warn(error.message);
            }
        } else {
            try {
                let data;
                let params;
                let body = await shelly.shellyRequestAsync(node.axiosInstance, 'GET', getStatusRoute, params, data, credentials, 5012);

                node.status({ fill: 'green', shape: 'ring', text: 'Connected.' });

                let status = body;
                msg.status = status;
                msg.payload = convertStatus1(status);
                node.send([msg]);
            } catch (error) {
                if (msg.payload) {
                    node.status({ fill: 'yellow', shape: 'ring', text: error.message });
                    node.warn(error.message);
                } else {
                    node.status({ fill: 'red', shape: 'ring', text: 'Error: ' + error });
                    node.warn('Error in executeCommand1: ' + getStatusRoute + '  --> ' + error);
                }
            }
        }
    }

    async function applySettings1Async(settings, node, credentials) {
        let success = false;
        if (settings !== undefined && Array.isArray(settings)) {
            for (let i = 0; i < settings.length; i++) {
                let setting = settings[i];

                let device = setting.device;
                let index = setting.index;
                let attribute = setting.attribute;
                let value = setting.value;

                if (device !== undefined && attribute !== undefined && value !== undefined) {
                    let settingRoute;

                    if (index !== undefined) {
                        settingRoute = '/settings/' + device + '/' + index + '?' + attribute + '=' + value;
                    } else {
                        settingRoute = '/settings/' + device + '?' + attribute + '=' + value;
                    }

                    try {
                        /*let body =*/ await shelly.shellyRequestAsync(node.axiosInstance, 'GET', settingRoute, null, null, credentials);
                        success = true;
                    } catch (error) {
                        node.status({ fill: 'red', shape: 'ring', text: 'Failed to set settings to: ' + settingRoute });
                        node.error('Failed to set settings to: ' + settingRoute, error);
                    }
                } else {
                    node.error('Failed to set settings as input is not complete: device, attribute and value must be specified. ' + setting);
                }
            }
        }

        return success;
    }

    // --------------------------------------------------------------------------------------------
    // The shelly node controls a shelly generation 1 device.
    function ShellyGen1Node(config) {
        RED.nodes.createNode(this, config);
        let node = this;

        node.server = RED.nodes.getNode(config.server);
        node.outputMode = config.outputmode;

        if (config.uploadretryinterval !== undefined && config.uploadretryinterval !== '') {
            node.initializeRetryInterval = parseInt(config.uploadretryinterval);
        } else {
            node.initializeRetryInterval = 5005;
        }

        node.verbose = config.verbose;
        node.hostname = utils.trim(config.hostname);
        node.authType = 'Basic';
        node.pollInterval = parseInt(config.pollinginterval);
        node.pollStatus = config.pollstatus;
        node.getStatusOnCommand = config.getstatusoncommand;

        node.rgbwMode = 'color';

        let deviceType = config.devicetype;
        node.deviceTypeMustMatchExactly = config.devicetypemustmatchexactly || false;

        node.mode = config.mode;
        if (!node.mode || node.server === undefined || node.server === null) {
            node.mode = 'polling';
        }

        node.status({});

        if (deviceType !== undefined && deviceType !== '') {
            node.axiosInstance = axios.create({
                baseURL: 'http://' + node.hostname + '/',
                timeout: 5000,
            });

            if (configuration.isExactTypeGen1(deviceType)) {
                node.model = deviceType; // device type is a specific model here
                node.deviceType = configuration.getDeviceType(node.model);
                node.types = [deviceType];
            } else {
                node.model = '';
                node.deviceType = deviceType;
                node.types = configuration.getDeviceTypes1(deviceType, node.deviceTypeMustMatchExactly);
            }

            node.initializer = getInitializer1(node.deviceType);
            node.inputParser = getInputParser1(node.deviceType);

            (async () => {
                let initialized = await node.initializer(node, node.types);

                // if the device is not online, then we wait until it is available and try again.
                if (!initialized) {
                    node.initializeTimer = setInterval(async function () {
                        let initialized = await node.initializer(node, node.types);
                        if (initialized) {
                            clearInterval(node.initializeTimer);
                        }
                    }, node.initializeRetryInterval);
                }
            })();

            this.on('input', async function (msg) {
                let credentials = shelly.getCredentials(node, msg);

                let settings = msg.settings;
                /*let success =*/ await applySettings1Async(settings, node, credentials);

                let route = await node.inputParser(msg, node, credentials);
                executeCommand1(msg, route, node, credentials);
            });

            // Callback mode:
            if (node.server !== null && node.server !== undefined && node.mode === 'callback') {
                node.onCallback = function (data) {
                    if (data.sender === node.hostname) {
                        if (node.outputMode === 'event') {
                            let msg = {
                                payload: data.event,
                            };
                            node.send([msg]);
                        } else if (node.outputMode === 'status') {
                            node.emit('input', {});
                        } else {
                            // not implemented
                        }
                    }
                };
                node.server.addListener('callback', node.onCallback);
            }

            this.on('close', function (done) {
                node.status({});

                if (node.onCallback) {
                    node.server.removeListener('callback', node.onCallback);
                }

                // TODO: call node.uninitializer();
                clearInterval(node.pollingTimer);
                clearInterval(node.initializeTimer);
                done();
            });
        } else {
            node.status({ fill: 'red', shape: 'ring', text: 'DeviceType not configured.' });
            node.warn('DeviceType not configured.');
        }
    }

    return ShellyGen1Node;
};
