/**
* Created by Karl-Heinz Wind
* see also https://shelly-api-docs.shelly.cloud/#common-http-api
**/

module.exports = function (RED) {
    "use strict";
    let axios = require('axios').default;      
    
    const fs = require("fs");
    const path = require("path");
    const fastify = require('fastify');

    let ip = require('ip');
    let localIpAddress = ip.address();

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
        let data;
        return shellyTryRequest('get', route, data, node, timeout, credentials, callback, errorCallback);
    }

    // Note that this function has a reduced timeout.
    function shellyTryRequest(method, route, data, node, timeout, credentials, callback, errorCallback){
    
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

        let config = {
            url : url,
            method : method,
            data : data,
            headers : headers,
            timeout: requestTimeout
        };
        const request = axios.request(config);

        request.then(response => {
            if(response.status == 200){
                callback(response.data);
            }
            else {
                node.status({ fill: "red", shape: "ring", text: "Error: " + response.statusText });
                node.warn("Error: " + response.statusText );
            }
        })
        .catch(error => {
            errorCallback(error);
        });
    }

    // generic REST request wrapper with promise
    function shellyRequestAsync(method, route, data, node, timeout, credentials){
        return new Promise(function (resolve, reject) {

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
            
            let config = {
                url : url,
                method : method,
                data : data,
                headers : headers,
                timeout: requestTimeout
            };
            const request = axios.request(config);
    

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

        // gen 1 and gen 2 devices support this endpoint (gen 2 return the same info for /rpc/Shelly.GetDeviceInfo)
        shellyTryGet('/shelly', node, node.pollInterval, credentials, function(body) {
            node.shellyInfo = body;

            let deviceType;
            // Generation 1 devices
            if(node.shellyInfo.type !== undefined){
                deviceType = node.shellyInfo.type;
            } // Generation 2 devices 
            else if(node.shellyInfo.model !== undefined && node.shellyInfo.gen === 2)
            {
                deviceType = node.shellyInfo.model;
            }

            let found = false;
            for (let i = 0; i < types.length; i++) {
                let type = types[i];

                // Generation 1 devices
                if(deviceType !== undefined){
                    found  = deviceType.startsWith(type);
                    if (found) {
                        break;
                    }    
                }
            }
            
            if(found){
                node.status({ fill: "green", shape: "ring", text: "Connected." });
            }
            else{
                node.status({ fill: "red", shape: "ring", text: "Shelly type mismatch: " + deviceType });
                node.warn("Shelly type mismatch: " + deviceType);
            }
        },
        function(error){
            node.status({ fill: "red", shape: "ring", text: error.message });
            node.warn(error.message);
        });
    }

    // Starts polling the status.
    function start(node, types){
        if(node.hostname !== ''){    

            let credentials = getCredentials(node);
            shellyPing(node, credentials, types);

            if(node.pollInterval > 0) {
                node.pollingTimer = setInterval(function() {
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

    function startAsync(node, types){
        return new Promise(function (resolve, reject) {
            start(node, types);
        });
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
                        node.warn("Downloading CSV failed " + emeter);
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
                        node.status({ fill: "red", shape: "ring", text: "Failed to set mode to: " + nodeMode});
                        node.warn("Failed to set mode to: " + nodeMode, error);
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
                    node.status({ fill: "red", shape: "ring", text: "Failed to set mode to: " + mode});
                    node.warn("Failed to set mode to: " + mode, error);
                }
            }
        }
    }

    function initializer1(node, types){
        let success = false;
        let mode = node.mode;
        if(mode === 'polling'){
            start(node, types);
            success = true;
        }
        else if(mode === 'callback'){
            node.error("Callback not supported for this type of device.");
            node.status({ fill: "red", shape: "ring", text: "Callback not supported" });
        }
        else{
            // nothing to do.
            success = true;
        }
        return success;
    }

    // starts polling or installs a webhook that calls a REST callback.
    async function initializer1WebhookAsync(node, types){

        let success = false;
        let mode = node.mode;
        if(mode === 'polling'){
            await startAsync(node, types);
            success = true;
        }
        else if(mode === 'callback'){
            let ipAddress = localIpAddress;
            if(node.server.hostname !== undefined && node.server.hostname !== ''){
                ipAddress = node.server.hostname;
            }
            
            let webhookUrl = 'http://' + ipAddress +  ':' + node.server.port + '/webhook';
            let webhookName = 'node-red-contrib-shelly';
            success = await tryInstallWebhook1Async(node, webhookUrl, webhookName);
        }
        else{
            // nothing to do.
            success = true;
        }

        return success;
    }

    // Installs a webhook.
    async function tryInstallWebhook1Async(node, webhookUrl, webhookName){
        let success = false;
        if(node.hostname !== ''){    

            let timeout = node.pollInterval;
            node.status({ fill: "yellow", shape: "ring", text: "Installing webhook..." });

            let credentials = getCredentials(node);

            // delete ttp://192.168.33.1/settings/actions?index=0&name=report_url&urls[]=
            // create http://192.168.33.1/settings/actions?index=0&name=report_url&enabled=true&urls[]=http://192.168.1.4/webhook
            try {
                let deleteRoute = '/settings/actions?index=0&name=report_url&urls[]=';
                let createRoute = '/settings/actions?index=0&name=report_url&enabled=true&urls[]=' + webhookUrl;
                try {
                    //let result1 = await shellyRequestAsync('get', deleteRoute, null, node, timeout, credentials);
                    let result2 = await shellyRequestAsync('get', createRoute, null, node, timeout, credentials);
                    node.status({ fill: "green", shape: "ring", text: "Connected." });
                    success = true;
                }
                catch (error) {
                    node.status({ fill: "yellow", shape: "ring", text: "Installing webhook...." });
                }
            }
            catch (error) {
                node.warn("Installing webhook failed " + error);
                // node.status({ fill: "red", shape: "ring", text: "Installing webhook failed "});
            }     
        }
        else {
            node.status({ fill: "red", shape: "ring", text: "Hostname not configured" });
        }

        return success;
    }

    // Gets a function that initialize the device.
    function getInitializer1(deviceType){
        let result;

        switch(deviceType) {
            case 'RGBW':
                result = initializerRGBW1Async;
                break;
            case 'Sensor':
                result = initializer1WebhookAsync;
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

    let gen1DeviceTypes = new Map([
        ["Relay",      ["SHSW-", "SHPLG-", "SHUNI-", "SHEM-"]],
        ["Measure",    ["SHEM-"]],
        ["Roller",     ["SHSW-L", "SHSW-25", "SHSW-21"]],
        ["Dimmer",     ["SHDM-", "SHBDUO-", "SHVIN-"]],
        ["Thermostat", ["SHTRV-"]],
        ["Sensor",     ["SHDW-", "SHGS-", "SHWT-", "SHSM-", "SHHT-", "SHMOS-"]],
        ["Button",     ["SHBTN-", "SHIX3-"]],
        ["RGBW",       ["SHRGBW2", "SHCB-"]],
    ]);

    function getDeviceTypes1(deviceType){
        let deviceTypes = gen1DeviceTypes.get(deviceType);
        if(deviceTypes === undefined){
            deviceTypes = []; 
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
                            node.status({ fill: "yellow", shape: "ring", text: error.message });
                            node.warn(error.message);
                        }
                    });
                } else {
                    node.status({ fill: "green", shape: "ring", text: "Connected." });

                    let payload;
                    if(body.result !== undefined){
                        payload = body.result;
                    } else if(body.error !== undefined){
                        payload = body.error;
                    } else {
                        // can this happen?
                    }

                    msg.payload = payload;
                    node.send([msg]);
                }
            },
            function(error){
                node.status({ fill: "yellow", shape: "ring", text: error.message });
                node.warn(error.message);
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
                    node.status({ fill: "yellow", shape: "ring", text: error.message });
                    node.warn(error.message);
                }
            });
        }
    }

    async function applySettings1Async(settings, node, credentials, timeout){
        let success = false;
        if(settings !== undefined && Array.isArray(settings)){
            for (let i = 0; i < settings.length; i++) {
                let setting = settings[i];

                let device = setting.device;
                let index = setting.index;
                let attribute = setting.attribute;
                let value = setting.value;

                if(device !== undefined && attribute !== undefined && value !== undefined){
                    let settingRoute;
                    
                    if(index !== undefined) {
                        settingRoute = '/settings/' + device + '/' + index + '?' + attribute + '=' + value;
                    }
                    else {
                        settingRoute = '/settings/' + device + '?' + attribute + '=' + value;
                    }

                    try {
                        let body = await shellyRequestAsync('get', settingRoute, null, node, timeout, credentials);
                        success = true;
                    }
                    catch (error) {
                        node.status({ fill: "red", shape: "ring", text: "Failed to set settings to: " + settingRoute});
                        node.error("Failed to set settings to: " + settingRoute, error);
                    }
                }
                else {
                    node.error("Failed to set settings as input is not complete: device, attribute and value must be specified. " + setting);    
                }
            }
        }

        return success;
    }

    // --------------------------------------------------------------------------------------------
    // The shelly callback server node
    function ShellyGen1ServerNode(config) {
        RED.nodes.createNode(this, config);

        let node = this;
        this.port = config.port;
        this.hostname = config.hostname;
        this.server = fastify();

        if(node.port > 0){
            node.server.listen({port : node.port}, (err, address) => {
                if (!err){
                    console.info("Shelly server is listening on port " + node.port);
                }
                else{
                    node.error("Shelly server failed to listen on port " + node.port);
                }
            })
    
            node.server.get("/webhook", (request, reply) => {
                let data = {
                    event : request.query
                };
                node.emit('callback', data);
                reply.code(200);
                reply.send();
            });
        }
            
        this.on('close', function (removed, done) {
            node.server.close().then(() => {
                done();
            });
        });
    }
    RED.nodes.registerType('shelly-gen1-server', ShellyGen1ServerNode, {
        credentials: {
            token: { type: 'text' },
        },
    });


    // --------------------------------------------------------------------------------------------
    // The shelly node controls a shelly generation 1 device.
    function ShellyGen1Node(config) {
        RED.nodes.createNode(this, config);
        let node = this;

        node.server = RED.nodes.getNode(config.server);
        node.outputMode = config.outputmode;
        node.initializeRetryInterval = parseInt(config.uploadretryinterval);
      
        node.hostname = config.hostname.trim();
        node.pollInterval = parseInt(config.pollinginterval);
        node.pollStatus = config.pollstatus;
        node.getStatusOnCommand = config.getstatusoncommand;
        
        node.rgbwMode = config.rgbwmode;

        let deviceType = config.devicetype;
        node.deviceType = deviceType;

        node.mode = config.mode;
        if (!node.mode) {
            node.mode = 'polling';
        }

        node.status({});

        if(deviceType !== undefined && deviceType !== "") {
            node.initializer = getInitializer1(deviceType);
            node.inputParser = getInputParser1(deviceType);
            node.types = getDeviceTypes1(deviceType);
            
            (async () => {
                let initialized = await node.initializer(node, node.types);

                // if the device is not online, then we wait until it is available and try again.
                if(!initialized){
                    node.initializeTimer = setInterval(async function() {

                        let initialized = await node.initializer(node, node.types);
                        if(initialized){
                            clearInterval(node.initializeTimer);
                        }
                    }, node.initializeRetryInterval);
                }
            })();
            
            this.on('input', async function (msg) {

                let credentials = getCredentials(node, msg);

                let settings = msg.settings;
                let timeout = node.pollInterval;
                let success = await applySettings1Async(settings, node, credentials, timeout);
         
                let route = await node.inputParser(msg, node, credentials);
                executeCommand1(msg, route, node, credentials);
            });

            
            // Callback mode:
            if(node.server !== null && node.server !== undefined && node.mode === 'callback') {
                node.onCallback = function (data) {
                    if(node.outputMode === 'event'){
                        let msg = {
                            payload : data.event
                        };
                        node.send([msg]);
                    }
                    else if(node.outputMode === 'status'){
                        node.emit("input", {});
                    }
                    else {
                        // not implemented
                    }
                };
                node.server.addListener('callback', node.onCallback);
            }

            this.on('close', function(done) {
                node.status({});

                if (node.onCallback) {
                    node.server.removeListener('callback', node.onCallback);
                }
    
                // TODO: call node.uninitializer();
                clearInterval(node.pollingTimer);
                clearInterval(node.initializeTimer);
                done();
            });
        }
        else{
            node.status({ fill: "red", shape: "ring", text: "DeviceType not configured." });
            node.warn("DeviceType not configured.");
        }
    }
    RED.nodes.registerType("shelly-gen1", ShellyGen1Node, {
        credentials: {
            username: { type: "text" },
            password: { type: "password" },
        }
    });



    // GEN 2 --------------------------------------------------------------------------------------
    
    // Uploads a skript.
    async function tryUploadScriptAsync(node, script, scriptName){
        let success = false;
        if(node.hostname !== ''){    

            let timeout = node.pollInterval;
            node.status({ fill: "yellow", shape: "ring", text: "Uploading script..." });

            let credentials = getCredentials(node);

            try {
                let scriptListResponse = await shellyRequestAsync('get', '/rpc/Script.List', null, node, timeout, credentials);
            
                let scriptId = -1;
                for (let scriptItem of scriptListResponse.scripts) {
                    if(scriptItem.name == scriptName){
                        scriptId = scriptItem.id;
                        break;
                    }
                };

                if(scriptId != -1) {
                    let deleteParams = { 'id' : scriptId };
                    await shellyRequestAsync('get', '/rpc/Script.Delete', deleteParams, node, timeout, credentials);
                }

                let createParams = { 'name' : scriptName };
                let createScriptResonse = await shellyRequestAsync('get', '/rpc/Script.Create', createParams, node, timeout, credentials);
                scriptId = createScriptResonse.id;

                let chunkSize = 1024;

                let done = false;
                do {
                    let codeToSend;
                    if (script.length > chunkSize) {
                        codeToSend = script.substr(0, chunkSize);
                        script = script.substr(chunkSize);
                    } else {
                        codeToSend = script;
                        done = true;
                    }
                    
                    let putParams = {  
                        'id' : scriptId,
                        'code' : codeToSend,
                        'append' : true
                    };
                    await shellyRequestAsync('post', '/rpc/Script.PutCode', putParams, node, timeout, credentials);

                } while (!done);

                let configParams = {  
                    'id' : scriptId,
                    'config' : {'enable' : true}
                };
                await shellyRequestAsync('get', '/rpc/Script.SetConfig ', configParams, node, timeout, credentials);
               
                let startParams = {  
                    'id' : scriptId,
                };
                await shellyRequestAsync('get', '/rpc/Script.Start ', startParams, node, timeout, credentials);
               
                let statusParams = {  
                    'id' : scriptId,
                };
                let status = await shellyRequestAsync('get', '/rpc/Script.GetStatus ', statusParams, node, timeout, credentials);

                if(status.running === true){
                    node.status({ fill: "green", shape: "ring", text: "Connected." });
                    success = true;
                }
                else {
                    node.error("Uploaded script not running.");
                    node.status({ fill: "red", shape: "ring", text: "Script not running." });         
                }
            }
            catch (error) {
                node.error("Uploading script failed " + error);
                node.status({ fill: "red", shape: "ring", text: "Uploading script failed "});
            }     
        }
        else {
            node.status({ fill: "red", shape: "ring", text: "Hostname not configured" });
        }

        return success;
    }
    
    // Installs a webhook.
    async function tryInstallWebhook2Async(node, webhookUrl, webhookName){
        let success = false;
        if(node.hostname !== ''){    

            let timeout = node.pollInterval;
            node.status({ fill: "yellow", shape: "ring", text: "Installing webhook..." });

            let credentials = getCredentials(node);

            try {
                let webhookListResponse = await shellyRequestAsync('get', '/rpc/Webhook.List', null, node, timeout, credentials);
            
                for (let webhookItem of webhookListResponse.hooks) {
                    if(webhookItem.name == webhookName){
                        let deleteParams = { 'id' : webhookItem.id };
                        let deleteWebhookResonse = await shellyRequestAsync('get', '/rpc/Webhook.Delete', deleteParams, node, timeout, credentials);
                    }
                };

                let supportedEventsResponse = await shellyRequestAsync('get', '/rpc/Webhook.ListSupported', null, node, timeout, credentials);
                for (let hookType of supportedEventsResponse.hook_types) {  
                    let url = webhookUrl + '?hookType=' + hookType;
                    let createParams = { 
                        'name' : webhookName,
                        'event' : hookType,
                        'cid' : 0,
                        'enable' : true,
                        "urls": [url]
                    };
                    let createWebhookResonse = await shellyRequestAsync('get', '/rpc/Webhook.Create', createParams, node, timeout, credentials);

                    node.status({ fill: "green", shape: "ring", text: "Connected." });
                    success = true;
                }
            }
            catch (error) {
                // node.warn("Installing webhook failed " + error);
                // node.status({ fill: "red", shape: "ring", text: "Installing webhook failed "});
            }     
        }
        else {
            node.status({ fill: "red", shape: "ring", text: "Hostname not configured" });
        }

        return success;
    }

    // Creates a route from the input.
    async function inputParserGeneric2Async(msg){
        
        let method = 'post';
        let data;
        let route;

        if(msg !== undefined && msg.payload !== undefined){
            
            let command = msg.payload;

            let rpcMethod;
            if(command.method !== undefined){
                rpcMethod = command.method;
            }

            let parameters;
            if(command.parameters !== undefined){
                parameters = command.parameters;
            }

            if(rpcMethod !== undefined){
                route = "/rpc/";
                data = {
                    id : 1,
                    method : rpcMethod,
                    params : parameters
                };
            }
        }

        let request = {
            route : route,
            method : method,
            data : data
        };
        return request;
    }

    // Returns the input parser for the device type.
    function getInputParser2(deviceType){
        
        let result;

        switch(deviceType) {
            case 'Relay':
            case 'Button':
                result = inputParserGeneric2Async;
                break;
            default:
                result = noop;
                break;
        }
        return result;
    }

    // starts the polling mode.
    function initializer2(node, types, mode){
        let success = false;
        if(mode === 'polling'){
            start(node, types);
            success = true;
        }
        else if(mode === 'callback'){
            node.error("Callback not supported for this type of device.");
            node.status({ fill: "red", shape: "ring", text: "Callback not supported" });
        }
        else{
            // nothing to do.
            success = true;
        }
        return success;
    }

    // starts polling or uploads a skript that calls a REST callback.
    async function initializer2CallbackAsync(node, types){

        let success = false;
        let mode = node.mode;
        if(mode === 'polling'){
            await startAsync(node, types);
            success = true;
        }
        else if(mode === 'callback'){
            let scriptPath = path.resolve(__dirname, './scripts/button.script');
            const buffer = fs.readFileSync(scriptPath);
            let script = buffer.toString();

            let ipAddress = localIpAddress;
            if(node.server.hostname !== undefined && node.server.hostname !== ''){
                ipAddress = node.server.hostname;
            }
            let url = 'http://' + ipAddress +  ':' + node.server.port + '/callback';
            script = script.replace('%URL%', url);
            let sender = node.hostname;
            script = script.replace('%SENDER%', sender);

            let scriptName = 'node-red-contrib-shelly';
            success = await tryUploadScriptAsync(node, script, scriptName);
        }
        else{
            // nothing to do.
            success = true;
        }

        return success;
    }

    // starts polling or installs a webhook that calls a REST callback.
    async function initializer2WebhookAsync(node, types){

        let success = false;
        let mode = node.mode;
        if(mode === 'polling'){
            await startAsync(node, types);
            success = true;
        }
        else if(mode === 'callback'){

            // here we reuse callback for webhooks.
            // As webhooks do not provide data we must poll the status on every event:
            node.outputMode = 'status';

            let ipAddress = localIpAddress;
            if(node.server.hostname !== undefined && node.server.hostname !== ''){
                ipAddress = node.server.hostname;
            }

            let webhookUrl = 'http://' + ipAddress +  ':' + node.server.port + '/webhook';
            let webhookName = 'node-red-contrib-shelly';
            success = await tryInstallWebhook2Async(node, webhookUrl, webhookName);
        }
        else{
            // nothing to do.
            success = true;
        }

        return success;
    }

    // Gets a function that initialize the device.
    function getInitializer2(deviceType){
        let result;

        switch(deviceType) {
            case 'Button':
            case 'Relay':
                result = initializer2CallbackAsync;
                break;
            case 'Sensor':
                result = initializer2WebhookAsync;
                break;
            default:
                result = initializer2;
                break;
        }
        return result;
    }

    let gen2DeviceTypes = new Map([
        ["Relay",      ["SNSW-", "SPSW-", "SNPL-"]],
        ["Button",     ["SNSN-"]],
        ["Sensor",     ["SNSN-"]], // Shelly Plus H&T only supports Webhook, no scripting
    ]);

    function getDeviceTypes2(deviceType){
        let deviceTypes = gen2DeviceTypes.get(deviceType);
        if(deviceTypes === undefined){
            deviceTypes = []; 
        }

        return deviceTypes;
    }


    let gen2StatusProperties = new Map([
        ["switch:0", "switch0"],
        ["switch:1", "switch1"],
        ["switch:2", "switch2"],
        ["switch:3", "switch3"],

        ["input:0", "input0"],
        ["input:1", "input1"],
        ["input:2", "input2"],
        ["input:3", "input3"],

        ["temperature:0", "temperature0"],
        ["temperature:1", "temperature1"],
        ["temperature:2", "temperature2"],
        ["temperature:3", "temperature3"],

        ["humidity:0", "humidity0"],
        ["humidity:1", "humidity1"],
        ["humidity:2", "humidity2"],
        ["humidity:3", "humidity3"],

        ["devicepower:0", "devicepower0"],
        ["devicepower:1", "devicepower1"],
        ["devicepower:2", "devicepower2"],
        ["devicepower:3", "devicepower3"],
    ]);

    // Returns a status object with filtered properties.
    function convertStatus2(status){
        let result = {};

        gen2StatusProperties.forEach((value, key, map) => {
            let statusValue = status[key];
            if(statusValue !== undefined) {
                result[value] = statusValue;
            }
        })

        return result;
    }

    function executeCommand2(msg, request, node, credentials){

        let getStatusRoute = '/rpc/Shelly.GetStatus';
        if (request !== undefined && request.route !== undefined && request.route !== ''){

            let route = request.route;
            let method = request.method;
            let data = request.data;
    
            shellyTryRequest(method, route, data, node, node.pollInterval, credentials, function(body) {

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
                            node.status({ fill: "yellow", shape: "ring", text: error.message });
                            node.warn(error);
                        }
                    });
                }
                else {
                    node.status({ fill: "green", shape: "ring", text: "Connected." });

                    let payload;
                    if(body.result !== undefined){
                        payload = body.result;
                    } else if(body.error !== undefined){
                        payload = body.error;
                    } else {
                        // can this happen?
                    }

                    msg.payload = payload;
                    node.send([msg]);
                }
            },
            function(error){
                node.status({ fill: "yellow", shape: "ring", text: error.message });
                node.warn(error);
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
                    node.status({ fill: "yellow", shape: "ring", text: error.message });
                    node.warn(error);
                }
            });
        }
    }


    // --------------------------------------------------------------------------------------------
    // The shelly callback server node
    function ShellyGen2ServerNode(config) {
        RED.nodes.createNode(this, config);

        let node = this;
        this.port = config.port;
        this.hostname = config.hostname;
        this.server = fastify();

        if(node.port > 0){
            node.server.listen({port : node.port}, (err, address) => {
                if (!err){
                    console.info("Shelly server is listening on port " + node.port);
                }
                else{
                    node.error("Shelly server failed to listen on port " + node.port);
                }
            })
    
            node.server.put("/callback", (request, reply) => {
                let data = request.body;
                node.emit('callback', data);
                reply.code(200);
                reply.send();
            });

            node.server.get("/webhook", (request, reply) => {
                // let hookType = request.query.hookType;
                // let data = request.body;
                node.emit('callback', {});
                reply.code(200);
                reply.send();
            });
        }
            
        this.on('close', function (removed, done) {
            node.server.close().then(() => {
                done();
            });
        });
    }
    RED.nodes.registerType('shelly-gen2-server', ShellyGen2ServerNode, {
        credentials: {
            token: { type: 'text' },
        },
    });


    // --------------------------------------------------------------------------------------------
    // The shelly node controls a shelly generation 1 device.
    function ShellyGen2Node(config) {
        RED.nodes.createNode(this, config);
        let node = this;
        
        node.server = RED.nodes.getNode(config.server);
        node.outputMode = config.outputmode;
        node.initializeRetryInterval = parseInt(config.uploadretryinterval);
        
        node.hostname = config.hostname.trim();
        node.pollInterval = parseInt(config.pollinginterval);
        node.pollStatus = config.pollstatus;
        node.getStatusOnCommand = config.getstatusoncommand;

        let deviceType = config.devicetype;
        node.deviceType = deviceType;
        
        node.mode = config.mode;
        if (!node.mode) {
            node.mode = 'polling';
        }

        node.status({});

        if(deviceType !== undefined && deviceType !== "") {
            node.initializer = getInitializer2(deviceType);
            node.inputParser = getInputParser2(deviceType);
            node.types = getDeviceTypes2(deviceType);
            
            (async () => {
                let initialized = await node.initializer(node, node.types);

                // if the device is not online, then we wait until it is available and try again.
                if(!initialized){
                    node.initializeTimer = setInterval(async function() {

                        let initialized = await node.initializer(node, node.types);
                        if(initialized){
                            clearInterval(node.initializeTimer);
                        }
                    }, node.initializeRetryInterval);
                }
            })();

            this.on('input', async function (msg) {
                let credentials = getCredentials(node, msg);
                let request = await node.inputParser(msg, node, credentials);
                executeCommand2(msg, request, node, credentials);
            });

            // Callback mode:
            if(node.server !== null && node.server !== undefined && node.mode === 'callback') {
                node.onCallback = function (data) {
                    if(node.outputMode === 'event'){
                        let msg = {
                            payload : data.event
                        };
                        node.send([msg]);
                    }
                    else if(node.outputMode === 'status'){
                        node.emit("input", {});
                    }
                    else {
                        // not implemented
                    }
                };
                node.server.addListener('callback', node.onCallback);
            }

            this.on('close', function(done) {
                node.status({});

                if (node.onCallback) {
                    node.server.removeListener('callback', node.onCallback);
                }
    
                // TODO: call node.uninitializer();
                clearInterval(node.pollingTimer);
                clearInterval(node.initializeTimer);
                done();
            });
        }
        else{
            node.status({ fill: "red", shape: "ring", text: "DeviceType not configured." });
            node.warn("DeviceType not configured");
        }
    }
    RED.nodes.registerType("shelly-gen2", ShellyGen2Node, {
        credentials: {
            username: { type: "text" },
            password: { type: "password" },
        }
    });
}