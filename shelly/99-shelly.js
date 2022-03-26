/**
* Created by Karl-Heinz Wind
* see also https://shelly-api-docs.shelly.cloud/#common-http-api
**/

module.exports = function (RED) {
    "use strict";
    let axios = require('axios').default;      

    //  no operation function
    function noop(){}

    function isEmpty(obj) {
        return Object.keys(obj).length === 0;
    }

    function combineUrl(path, parameters) {
        let route = path + '?';

        if(parameters.charAt(0) === '&'){
            parameters = parameters.substring(1);
        }

        route += parameters;
        return route;
    }

    // extracts the credentials from the message and the node.
    function getCredentials(node, msg){

        let hostname;
        let username;
        let password;
        if(msg !== undefined && msg.payload !== undefined){
            hostname = msg.payload.hostname; 
            username = msg.payload.username; 
            password = msg.payload.password; 
        }

        if(hostname === undefined) {
            hostname = node.hostname;
        }

        if(username === undefined) {
            username = node.credentials.username;
        }

        if(password === undefined) {
            password = node.credentials.password;
        }

        let credentials = {
            hostname : hostname,
            username : username,
            password : password,
        };

        return credentials;
    }

    // Note that this function has a reduced timeout.
    function shellyTryGet(route, node, timeout, credentials, callback, errorCallback){

        // We avoid an invalid timeout by taking a default if 0.
        let requestTimeout = timeout;
        if(requestTimeout <= 0){
            requestTimeout = 5000;
        }

        let headers = {};
        if(credentials.username !== undefined && credentials.password !== undefined) {
            headers.Authorization = "Basic " + Buffer.from(credentials.username + ":" + credentials.password).toString("base64");
        };

        let url = 'http://' + credentials.hostname + route;

        const request = axios.get(url, {
            headers : headers,
            timeout: requestTimeout
        });

        request.then(response => {
            if(response.status == 200){
                callback(response.data);
            }
            else {
                node.status({ fill: "red", shape: "ring", text: "Error: " + response.statusText });
            }
        })
        .catch(error => {
            errorCallback(error);
        });
    }

    // generic REST get wrapper with promise
    function shellyGetAsync(route, credentials){
        return new Promise(function (resolve, reject) {

            let headers = {};
            if(credentials.username !== undefined && credentials.password !== undefined) {
                headers.Authorization = "Basic " + Buffer.from(credentials.username + ":" + credentials.password).toString("base64");
            };

            let url = 'http://' + credentials.hostname + route;
            
            const request = axios.get(url, {
                headers : headers
            });

            request.then(response => {
                if(response.status == 200){
                    resolve(response.data)
                } else {
                    reject(response.statusText);
                }
            })
            .catch(error => {
                reject(error);
            });
          });
    }

    function shellyPing(node, credentials, types){

        shellyTryGet('/shelly', node, node.pollInterval, credentials, function(body) {
            node.shellyInfo = body;

            let found = false;
            for (let i = 0; i < types.length; i++) {
                let type = types[i];

                // Generation 1 devices
                if(node.shellyInfo.type !== undefined){
                    found  = node.shellyInfo.type.startsWith(type)
                    if (found) {
                        break;
                    }    
                } // Generation 2 devices 
                else if(node.shellyInfo.model !== undefined && node.shellyInfo.gen === 2)
                {
                    found  = node.shellyInfo.model.startsWith(type)
                    if (found) {
                        break;
                    }    
                }
            }
            
            if(found){
                node.status({ fill: "green", shape: "ring", text: "Connected." });
            }
            else{
                node.status({ fill: "red", shape: "ring", text: "Shelly type mismatch: " + node.shellyInfo.type });
            }
        },
        function(error){
            node.status({ fill: "red", shape: "ring", text: error })
        });
    }

    // Starts polling the status.
    function start(node, types){
        if(node.hostname !== ''){    

            let credentials = getCredentials(node);
            shellyPing(node, credentials, types);

            if(node.pollInterval > 0) {
                node.timer = setInterval(function() {
                    shellyPing(node, credentials, types);

                    if(node.pollStatus){
                        node.emit("input", {});
                    }    
                }, node.pollInterval);
            }
            else{
                node.status({ fill: "yellow", shape: "ring", text: "Polling is turned off" });
            }
        }
        else {
            node.status({ fill: "red", shape: "ring", text: "Hostname not configured" });
        }
    }


    // GEN 1 --------------------------------------------------------------------------------------
   
    // Creates a route from the input.
    async function inputParserRelay1Async(msg){
        let route;
        if(msg !== undefined && msg.payload !== undefined){
            let command = msg.payload;

            let relay = 0;
            if(command.relay !== undefined){
                relay = command.relay;
            }

            let turn;
            if(command.on !== undefined){
                if(command.on == true){
                    turn = "on";
                }
                else{
                    turn = "off"
                }
            }
            else if(command.turn !== undefined){
                turn = command.turn;
            }

            let timerSeconds;
            if(command.timer !== undefined){
                timerSeconds = command.timer;
            }


            let parameters = '';
            if (turn !== undefined){
                parameters += "&turn=" + turn;
            }

            if(timerSeconds !== undefined){
                parameters += "&timer=" + timerSeconds;
            }

            if (parameters !== '') {
                route = combineUrl("/relay/" + relay, parameters);
            }
        }
        return route;
    }

    // Creates a route from the input.
    async function inputParserMeasure1Async(msg, node, credentials){
        let route;
        if(msg !== undefined && msg.payload !== undefined){
            let command = msg.payload;

            let relay = 0;
            if(command.relay !== undefined){
                relay = command.relay;
            }

            let turn;
            if(command.on !== undefined){
                if(command.on == true){
                    turn = "on";
                }
                else{
                    turn = "off"
                }
            }
            else if(command.turn !== undefined){
                turn = command.turn;
            }

            let timerSeconds;
            if(command.timer !== undefined){
                timerSeconds = command.timer;
            }


            let parameters = '';
            if (turn !== undefined){
                parameters += "&turn=" + turn;
            }

            if(timerSeconds !== undefined){
                parameters += "&timer=" + timerSeconds;
            }

            if (parameters !== '') {
                route = combineUrl("/relay/" + relay, parameters);
            }


            // Download EM data if required.
            let emetersToDownload;
            if(command.download !== undefined){
                emetersToDownload = command.download;
            }

            // special download code for EM devices that can store historical data.
            if(emetersToDownload !== undefined){

                let data = [];
                for (let i = 0; i < emetersToDownload.length; i++) {
                    let emeter = emetersToDownload[i];
                    let downloadRoute = "/emeter/" + emeter + "/em_data.csv";
                    
                    node.status({ fill: "green", shape: "ring", text: "Downloading CSV " + emeter});

                    try {
                        let body = await shellyGetAsync(downloadRoute, credentials);
                        data.push(body);
                    }
                    catch (error) {
                        node.error("Downloading CSV failed " + emeter, error);
                        node.status({ fill: "red", shape: "ring", text: "Downloading CSV failed " + emeter});
                    }
                }

                node.status({ fill: "green", shape: "ring", text: "Connected."});

                msg.payload = data;
                node.send([null, msg]);
            }
        }

        return route;
    }

    // Creates a route from the input.
    async function inputParserRoller1Async(msg){
        let route;
        if(msg !== undefined && msg.payload !== undefined){
            let command = msg.payload;

            let roller = 0;
            if(command.roller !== undefined){
                roller = command.roller;
            }

            let go;
            if(command.go !== undefined){
                go = command.go;

                if (command.go == "to_pos" && command.roller_pos !== undefined) {
                    go += "&roller_pos=" + command.roller_pos;
                }
            }

            if(go !== undefined){
                route = "/roller/" + roller + "?go=" + go;
            }

            // we fall back to relay mode if no valid roller command is received.
            if(route === undefined)
            {
                let relay = 0;
                if(command.relay !== undefined){
                    relay = command.relay;
                }

                let turn;
                if(command.on !== undefined){
                    if(command.on == true){
                        turn = "on";
                    }
                    else{
                        turn = "off"
                    }
                }
                else if(command.turn !== undefined){
                    turn = command.turn;
                }

                if(turn !== undefined){
                    route = "/relay/" + relay + "?turn=" + turn;
                }
            }
        }
        return route;
    }

    // Creates a route from the input.
    async function inputParserDimmer1Async(msg){
        let route;
        if(msg !== undefined && msg.payload !== undefined){
            let command = msg.payload;

            let light = 0;
            if(command.light !== undefined){
                light = command.light;
            }

            let turn;
            if(command.on !== undefined){
                if(command.on == true){
                    turn = "on";
                }
                else{
                    turn = "off"
                }
            }
            else if(command.turn !== undefined){
                turn = command.turn;
            }
            else{
                // turn is undefined
            }

            let brightness;
            if(command.brightness !== undefined){
                if(command.brightness >=1 && command.brightness <= 100){
                    brightness = command.brightness;
                } else { 
                    brightness = 100;  // Default to full brightness
                }
            }

            let white;
            if(command.white !== undefined){
                if(command.white >=1 && command.white <= 100){
                    white = command.white;
                } else { 
                    // Default is undefined
                }
            }

            let temperature;
            if(command.temp !== undefined){
                if(command.temp >=2700 && command.temp <= 6500){
                    temperature = command.temp;
                } else { 
                    // Default is undefined
                }
            }

            let transition;
            if(command.transition !== undefined){
                if(command.transition >=0 && command.transition <= 5000){
                    transition = command.transition;
                } else { 
                    // Default is undefined
                }
            }


            let parameters = '';
            if (turn !== undefined){
                parameters += "&turn=" + turn;
            }

            if (brightness !== undefined){
                parameters += "&brightness=" + brightness;
            }

            if(white !== undefined) {
                parameters += "&white=" + white;
            }

            if(temperature !== undefined) {
                parameters += "&temp=" + temperature;
            }

            if(transition !== undefined) {
                parameters += "&transition=" + transition;
            }

            if (parameters !== '') {
                route = combineUrl("/light/" + light, parameters);
            }
        }
        return route;
    }

    // Creates a route from the input.
    async function inputParserThermostat1Async(msg){
        let route;
        if(msg !== undefined && msg.payload !== undefined){
            let command = msg.payload;

            let thermostat = 0;
        
            let position;
            if(command.position !== undefined){
                if(command.position >=0 && command.position <= 100){
                    position = command.position;
                } else { 
                    // Default is undefined
                }
            }

            let temperature;
            if(command.temperature !== undefined){
                if(command.temperature >=4 && command.temperature <= 31){
                    temperature = command.temperature;
                } else { 
                    // Default is undefined
                }
            }

            let schedule;
            if(command.schedule !== undefined){
                if(command.schedule == true || command.schedule == false){
                    schedule = command.schedule;
                }
            }

            let scheduleProfile;
            if(command.scheduleProfile !== undefined){
                if(command.scheduleProfile >= 1 || command.scheduleProfile <= 5){
                    scheduleProfile = command.scheduleProfile;
                }
            }

            let boostMinutes;
            if(command.boostMinutes !== undefined){
                if(command.boostMinutes >= 0){
                    boostMinutes = command.boostMinutes;
                }
            }


            let parameters = '';
            if (position !== undefined){
                parameters = "&pos=" + position;
            }

            if (temperature !== undefined){
                parameters += "&target_t=" + temperature;
            }

            if (schedule !== undefined){
                parameters += "&schedule=" + schedule;
            }

            if (scheduleProfile !== undefined){
                parameters += "&schedule_profile=" + scheduleProfile;
            }

            if (boostMinutes !== undefined){
                parameters += "&boost_minutes=" + boostMinutes;
            }

            if (parameters !== '') {
                route = combineUrl("/thermostat/" + thermostat, parameters);
            }
        }
        return route;
    }

    // Creates a route from the input.
    async function inputParserSensor1Async(msg){
        let route;
        if(msg !== undefined && msg.payload !== undefined){
            // right now sensors do not accept input commands.
        }
        return route;
    }

    // Creates a route from the input.
    async function inputParserButton1Async(msg){
        let route;
        if(msg !== undefined && msg.payload !== undefined){
            let command = msg.payload;

            let input = 0;
            if(command.input !== undefined){
                input = command.input;
            }

            let event = 'S';
            if(command.event !== undefined){
                event = command.event;
            }

            let eventCount;
            if(command.eventCount !== undefined){
                eventCount = command.eventCount;
            }


            let parameters = '';
            if (event !== undefined){
                parameters = "&event=" + event;
            }

            if (eventCount !== undefined){
                parameters += "&event_cnt=" + eventCount;
            }

            if (parameters !== '') {
                route = combineUrl("/input/" + input, parameters);
            }
        }
        return route;
    }

    // Creates a route from the input.
    async function inputParserRGBW1Async(msg, node, credentials){
        let route;
        if(msg !== undefined && msg.payload !== undefined){
            let command = msg.payload;

            let nodeMode;
            if(command.mode !== undefined) {
                nodeMode = command.mode;

                if (node.rgbwMode === 'auto') {
                    try {
                        let modeRoute = '/settings?mode=' + nodeMode;
                        let body = await shellyGetAsync(modeRoute, credentials);
                    }
                    catch (error) {
                        node.error("Failed to set mode to: " + nodeMode, error);
                        node.status({ fill: "red", shape: "ring", text: "Failed to set mode to: " + nodeMode});
                    }
                }
            }
            else {
                nodeMode = node.rgbwMode;
            }

            if(nodeMode === "color") {

                let red;
                if(command.red !== undefined) {
                    if(command.red >= 0 && command.red <= 255) {
                        red = command.red;
                    } else {
                        red = 255;  // Default to full brightness
                    }
                }

                let green;
                if (command.green !== undefined) {
                    if (command.green >= 0 && command.green <= 255) {
                        green = command.green;
                    } else {
                        green = 255;  // Default to full brightness
                    }
                }

                let blue ;
                if(command.blue !== undefined){
                    if (command.blue >= 0 && command.blue <= 255){
                        blue = command.blue;
                    } else {
                        blue = 255;  // Default to full brightness
                    }
                }

                let white;
                if(command.white !== undefined) {
                    if (command.white >= 0 && command.white <= 255) {
                        white = command.white;
                    } else {
                        white = 255;  // Default to full brightness
                    }
                }

                let temperature;
                if(command.temp !== undefined) {
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
                        gain = 100;  // Default to full gain
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
                    if (command.effect >=0) {
                        effect = command.effect;
                    } else {
                        effect = 0  // Default to no effect
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
                    if (command.timer >=0) {
                        timer = command.timer;
                    } else {
                        timer = 0  // Default to no timer
                    }
                }

                let turn;
                if (command.on !== undefined) {
                    if (command.on == true) {
                        turn = "on";
                    }
                    else {
                        turn = "off"
                    }
                }
                else if (command.turn !== undefined) {
                    turn = command.turn;
                }
                else
                {
                    turn = "on";
                }

                
                // create route
                route = "/color/0?turn=" + turn;

                if(gain !== undefined) {
                    route += "&gain=" + gain;
                }
                
                if(red !== undefined) {
                    route += "&red=" + red;
                }

                if(green !== undefined) {
                    route += "&green=" + green;
                }

                if(blue !== undefined) {
                    route += "&blue=" + blue;
                }

                if(white !== undefined) {
                    route += "&white=" + white;
                }

                if(temperature !== undefined) {
                    route += "&temp=" + temperature;
                }

                if(brightness !== undefined) {
                    route += "&brightness=" + brightness;
                }

                if(effect !== undefined) {
                    route += "&effect=" + effect;
                }

                if(transition !== undefined) {
                    route += "&transition=" + transition;
                }

                if(timer !== undefined && timer > 0) {
                    route += "&timer=" + timer;
                }
            }
            else if(nodeMode === "white") {

                let light = 0;
                if (command.light !== undefined) {
                    if (command.light >=0) {
                        light = command.light;
                    } else {
                        light = 0  // Default to no 0
                    }
                }

                let brightness;
                if (command.brightness !== undefined) {
                    if (command.brightness >= 0 && command.brightness <= 100) {
                        brightness = command.brightness;
                    } else {
                        brightness = 100;  // Default to full brightness
                    }
                }

                let temperature;
                if(command.temp !== undefined) {
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
                    if (command.timer >=0) {
                        timer = command.timer;
                    } else {
                        timer = 0  // Default to no timer
                    }
                }

                let turn;
                if (command.on !== undefined) {
                    if (command.on == true) {
                        turn = "on";
                    }
                    else {
                        turn = "off"
                    }
                }
                else if (command.turn !== undefined) {
                    turn = command.turn;
                }
                else
                {
                    turn = "on";
                }


                // create route
                route = "/white/" + light + "?turn=" + turn;

                if(brightness !== undefined) {
                    route += "&brightness=" + brightness;
                }

                if(temperature !== undefined) {
                    route += "&temp=" + temperature;
                }

                if(transition !== undefined) {
                    route += "&transition=" + transition;
                }

                if(timer !== undefined && timer > 0) {
                    route += "&timer=" + timer;
                }
            }
            else {
                // node mode Auto or None
            }

        }
        return route;
    }

    // Returns the input parser for the device type.
    function getInputParser1(deviceType){
        
        let result;

        switch(deviceType) {

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
                result = noop;
                break;
        }
        return result;
    }

    // initializes a RGBW node.
    async function initializerRGBW1Async(node, types){
    
        start(node, types);
    
        if(node.hostname !== ''){
            let mode = node.rgbwMode;
            if(mode === "color" || mode === "white"){
                try {
                    let credentials = getCredentials(node);
            
                    let modeRoute = '/settings?mode=' + mode;
                    let body = await shellyGetAsync(modeRoute, credentials);
                    // here we can not check if the mode is already changed so we can not display a proper status.
                }
                catch (error) {
                    node.error("Failed to set mode to: " + mode, error);
                    node.status({ fill: "red", shape: "ring", text: "Failed to set mode to: " + mode});
                }
            }
        }
    }

    function initializer1(node, types){
        start(node, types);
    }

    // Gets a function that initialize the device.
    function getInitializer1(deviceType){
        let result;

        switch(deviceType) {
            case 'RGBW':
                result = initializerRGBW1Async;
                break;
            default:
                result = initializer1;
                break;
        }
        return result;
    }

    
    // Returns a status object with filtered properties.
    function convertStatus1(status){
        let result = {
        }

        if(status.relays !== undefined){
            result.relays = status.relays;
        }

        if(status.rollers !== undefined){
            result.rollers = status.rollers;
        }

        if(status.lights !== undefined){
            result.lights = status.lights;
        }

        if(status.thermostats !== undefined){
            result.thermostats = status.thermostats;
        }

        if(status.meters !== undefined){
            result.meters = status.meters;
        }

        if(status.emeters !== undefined){
            result.emeters = status.emeters;
        }

        if(status.inputs !== undefined){
            result.inputs = status.inputs;
        }

        if(status.adcs !== undefined){
            result.adcs = status.adcs;
        }

        if(status.sensor !== undefined){
            result.sensor = status.sensor;
        }

        if(status.lux !== undefined){
            result.lux = status.lux;
        }

        if(status.bat !== undefined){
            result.bat = status.bat;
        }

        if(status.tmp !== undefined){
            result.tmp = status.tmp;
        }

        if(status.hum !== undefined){
            result.hum = status.hum;
        }

        if(status.smoke !== undefined){
            result.smoke = status.smoke;
        }

        if(status.flood !== undefined){
            result.flood = status.flood;
        }

        if(status.accel !== undefined){
            result.accel = status.accel;
        }

        if(status.concentration !== undefined){
            result.concentration = status.concentration;
        }

        return result;
    }

    function getDeviceTypes1(deviceType){
        let deviceTypes;
        switch(deviceType) {

            case 'Relay':
                deviceTypes = ["SHSW", "SHPLG", "SHUNI", "SHEM"]; // not that SHEM is also a relay!
                break;
            case 'Measure':
                deviceTypes = ["SHEM"];
                break;
            case 'Roller':
                deviceTypes = ["SHSW-L", "SHSW-25"];
                break;
            case 'Dimmer':
                deviceTypes = ["SHDM-", "SHBDUO-", "SHVIN-"];
                break;
            case 'Thermostat':
                deviceTypes = ["SHTRV-" ];
                break;
            case 'Sensor':
                deviceTypes = ["SHTSHDW-", "SHGS-", "SHWT-", "SHSM-", " SHHT-", "SHMOS-" ];
                break;
            case 'Button':
                deviceTypes = ["SHBTN", "SHIX3"];
                break;
            case 'RGBW':
                deviceTypes = ["SHRGBW2", "SHCB-1"];
                break;
            default:
                deviceTypes = [];
                break;
        }

        return deviceTypes;
    }

    function executeCommand1(msg, route, node, credentials){
        let getStatusRoute = '/status';
        if (route !== undefined && route !== ''){

            shellyTryGet(route, node, node.pollInterval, credentials, function(body) {
                if (node.getStatusOnCommand) {
                    shellyTryGet(getStatusRoute, node, node.pollInterval, credentials, function(body) {
                        
                        node.status({ fill: "green", shape: "ring", text: "Connected." });

                        let status = body;
                        msg.status = status;
                        msg.payload = convertStatus1(status);
                        node.send([msg]);
                    },
                    function(error){
                        if (msg.payload){
                            node.status({ fill: "yellow", shape: "ring", text: "Device not reachable." });
                        }
                    });
                }
            },
            function(error){
                node.status({ fill: "yellow", shape: "ring", text: "Device not reachable." })
            });
        }
        else {
            shellyTryGet(getStatusRoute, node, node.pollInterval, credentials, function(body) {
                    
                node.status({ fill: "green", shape: "ring", text: "Connected." });

                let status = body;
                msg.status = status;
                msg.payload = convertStatus1(status);
                node.send([msg]);
            },
            function(error){
                if (msg.payload){
                    node.status({ fill: "yellow", shape: "ring", text: "Device not reachable." });
                }
            });
        }
    }

    async function applySettings1Async(msg, node, credentials){
        let settings = msg.settings;
        if(settings !== undefined && Array.isArray(settings)){
            for (let i = 0; i < settings.length; i++) {
                let setting = settings[i];

                let device = setting.device;
                let index = setting.index || 0;
                let attribute = setting.attribute;
                let value = setting.value;

                if(device !== undefined && attribute !== undefined && value !== undefined){
                    let settingRoute = '/settings/' + device + '/' + index + '?' + attribute + '=' + value;
                    try {
                        let body = await shellyGetAsync(settingRoute, credentials);
                    }
                    catch (error) {
                        node.error("Failed to set settings to: " + settingRoute, error);
                        node.status({ fill: "red", shape: "ring", text: "Failed to set settings to: " + settingRoute});
                    }
                }
                else {
                    node.error("Failed to set settings as input is not complete: device, attribute and value must be specified. " + setting);    
                }
            }
        }
    }

    // --------------------------------------------------------------------------------------------
    // The shelly node controls a shelly generation 1 device.
    function ShellyGen1Node(config) {
        RED.nodes.createNode(this, config);
        let node = this;
        node.hostname = config.hostname.trim();
        node.pollInterval = parseInt(config.pollinginterval);
        node.pollStatus = config.pollstatus;
        node.getStatusOnCommand = config.getstatusoncommand;

        node.rgbwMode = config.rgbwmode;

        let deviceType = config.devicetype;
        node.deviceType = deviceType;

        node.status({});

        if(deviceType !== undefined && deviceType !== "") {
            node.initializer = getInitializer1(deviceType);
            node.inputParser = getInputParser1(deviceType);
            node.types = getDeviceTypes1(deviceType);
            
            node.initializer(node, node.types);
            
            this.on('input', async function (msg) {

                let credentials = getCredentials(node, msg);

                await applySettings1Async(msg, node, credentials);
         
                let route = await node.inputParser(msg, node, credentials);
                executeCommand1(msg, route, node, credentials);
            });

            this.on('close', function(done) {
                clearInterval(node.timer);
                done();
            });
        }
        else{
            node.status({ fill: "red", shape: "ring", text: "DeviceType not configured." });
        }
    }
    RED.nodes.registerType("shelly-gen1", ShellyGen1Node, {
        credentials: {
            username: { type: "text" },
            password: { type: "password" },
        }
    });



    // GEN 2 --------------------------------------------------------------------------------------
    
    
    // Creates a route from the input.
    async function inputParserRelay2Async(msg){
        let route;
        if(msg !== undefined && msg.payload !== undefined){
            
            let command = msg.payload;

            let id;
            if(command.id !== undefined){
                id = command.id;
            }

            let method;
            if(command.method !== undefined){
                method = command.method;
            }

            // Switch.Set (default)
            if(method === undefined){
                if(id !== undefined && command.on !== undefined){
                    route = "/rpc/Switch.Set?id=" + id + "&on=" + command.on;
                
                    if(command.toggle_after !== undefined){
                        route += "&toggle_after=" + command.toggle_after;
                    }
                }
            }
            else if (method === "Switch.Toggle"){
                if(id !== undefined){
                    route = "/rpc/Switch.Toggle?id=" + id;
                }
            }
            else{
                // nothing to do.
            }
        }
        return route;
    }

     // Returns the input parser for the device type.
     function getInputParser2(deviceType){
        
        let result;

        switch(deviceType) {
            case 'Relay':
                result = inputParserRelay2Async;
                break;
            default:
                result = noop;
                break;
        }
        return result;
    }

    function initializer2(node, types){
        start(node, types);
    }

    // Gets a function that initialize the device.
    function getInitializer2(deviceType){
        let result;

        switch(deviceType) {
            // TODO: for future usage
            default:
                result = initializer2;
                break;
        }
        return result;
    }

    function getDeviceTypes2(deviceType){
        let deviceTypes;
        switch(deviceType) {

            case 'Relay':
                deviceTypes = ["SNSW-"];
                break;
            default:
                deviceTypes = [];
                break;
        }

        return deviceTypes;
    }

    // Returns a status object with filtered properties.
    function convertStatus2(status){
        let result = {
        }

        if(status['switch:0'] !== undefined){
            result.switch0 = status['switch:0'];
        }
        if(status['switch:1'] !== undefined){
            result.switch1 = status['switch:1'];
        }
        if(status['switch:2'] !== undefined){
            result.switch2 = status['switch:2'];
        }
        if(status['switch:3'] !== undefined){
            result.switch3 = status['switch:3'];
        }

        if(status['input:0'] !== undefined){
            result.input0 = status['input:0'];
        }
        if(status['input:1'] !== undefined){
            result.input1 = status['input:1'];
        }
        if(status['input:2'] !== undefined){
            result.input2 = status['input:2'];
        }
        if(status['input:3'] !== undefined){
            result.input3 = status['input:3'];
        }

        return result;
    }

    function executeCommand2(msg, route, node, credentials){
        let getStatusRoute = '/rpc/Shelly.GetStatus';
        if (route !== undefined && route !== ''){

            shellyTryGet(route, node, node.pollInterval, credentials, function(body) {
                if (node.getStatusOnCommand) {
                    shellyTryGet(getStatusRoute, node, node.pollInterval, credentials, function(body) {
                        
                        node.status({ fill: "green", shape: "ring", text: "Connected." });

                        let status = body;
                        msg.status = status;
                        msg.payload = convertStatus2(status);
                        node.send([msg]);
                    },
                    function(error){
                        if (msg.payload){
                            node.status({ fill: "yellow", shape: "ring", text: "Device not reachable." });
                        }
                    });
                }
            },
            function(error){
                node.status({ fill: "yellow", shape: "ring", text: "Device not reachable." })
            });
        }
        else {
            shellyTryGet(getStatusRoute, node, node.pollInterval, credentials, function(body) {
                    
                node.status({ fill: "green", shape: "ring", text: "Connected." });

                let status = body;
                msg.status = status;
                msg.payload = convertStatus2(status);
                node.send([msg]);
            },
            function(error){
                if (msg.payload){
                    node.status({ fill: "yellow", shape: "ring", text: "Device not reachable." });
                }
            });
        }
    }

    // --------------------------------------------------------------------------------------------
    // The shelly node controls a shelly generation 1 device.
    function ShellyGen2Node(config) {
        RED.nodes.createNode(this, config);
        let node = this;
        node.hostname = config.hostname.trim();
        node.pollInterval = parseInt(config.pollinginterval);
        node.pollStatus = config.pollstatus;
        node.getStatusOnCommand = config.getstatusoncommand;

        let deviceType = config.devicetype;
        node.deviceType = deviceType;

        node.status({});

        if(deviceType !== undefined && deviceType !== "") {
            node.initializer = getInitializer2(deviceType);
            node.inputParser = getInputParser2(deviceType);
            node.types = getDeviceTypes2(deviceType);
            
            node.initializer(node, node.types);
            
            this.on('input', async function (msg) {

                let credentials = getCredentials(node, msg);
                
                let route = await node.inputParser(msg, node, credentials);
                executeCommand2(msg, route, node, credentials);
            });

            this.on('close', function(done) {
                clearInterval(node.timer);
                done();
            });
        }
        else{
            node.status({ fill: "red", shape: "ring", text: "DeviceType not configured." });
        }
    }
    RED.nodes.registerType("shelly-gen2", ShellyGen2Node, {
        credentials: {
            username: { type: "text" },
            password: { type: "password" },
        }
    });
}