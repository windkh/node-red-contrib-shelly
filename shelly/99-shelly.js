/**
* Created by Karl-Heinz Wind
* see also https://shelly-api-docs.shelly.cloud/#common-http-api
**/

module.exports = function (RED) {
    "use strict";
    const axios = require('axios').default;      

    const rateLimit = require("axios-rate-limit");
    const cloudAxios = rateLimit(axios.create(), { maxRequests: 1, perMilliseconds: 1000, maxRPS: 1 });

    const { readFile } = require('fs/promises');
    const path = require('node:path');
    const fastify = require('fastify');
    const crypto = require('node:crypto');
    
    const ip = require('ip');
    let localIpAddress = ip.address();
    let nonceCount = 1;

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

        let authType = node.authType;
        if(authType === 'Digest') {
            username = 'admin'; // see https://shelly-api-docs.shelly.cloud/gen2/General/Authentication
        }

        let credentials = {
            hostname : hostname,
            authType : authType,
            username : username,
            password : password,
        };

        return credentials;
    }

    // Encrypts a string using SHA-256.
    function sha256(str){
        let result = crypto.createHash('sha256').update(str).digest('hex');
        return result;
    }

    // see https://shelly-api-docs.shelly.cloud/gen2/General/Authentication
    // see https://github.com/axios/axios/issues/686
    function getDigestAuthorization(response, credentials, config){
        let authDetails = response.headers['www-authenticate'].split(', ');
        let propertiesArray = authDetails.map(v => v.split('='));
        let properties = new Map(propertiesArray.map(obj => [obj[0], obj[1]]));

        nonceCount++; // global counter
        let url = config.url;
        let method = config.method;

        let algorithm = properties.get('algorithm'); // TODO: check if it is still SHA-256 
        let username = credentials.username;
        let password = credentials.password;
        let realm = properties.get('realm').replace(/"/g, '');
        let authParts = [username, realm, password];

        let ha1String = authParts.join(':');
        let ha1 = sha256(ha1String);
        let ha2String = method + ':' + url;
        let ha2 = sha256(ha2String);
        let nc = ('00000000' + nonceCount).slice(-8);
        let nonce = properties.get('nonce').replace(/"/g, '');
        let cnonce = crypto.randomBytes(24).toString('hex');
        let responseString = ha1 + ":" + nonce + ":" + nc + ":" + cnonce + ":" + "auth" + ":" + ha2;
        let responseHash = sha256(responseString);

        const authorization = 
            'Digest username="' + username + 
            '", realm="' + realm + 
            '", nonce="' + nonce + 
            '", uri="' + url + 
            '", cnonce="' + cnonce + 
            '", nc=' + nc + 
            ', qop=auth' + 
            ', response="' + responseHash + 
            '", algorithm=SHA-256';
        return authorization;
    }

    // Gets a header with the authorization property for the request.
    function getHeaders(credentials){
        let headers = {};
        if(credentials.authType === 'Basic') {
            if(credentials.username !== undefined && credentials.password !== undefined) {
                headers.authorization = "Basic " + Buffer.from(credentials.username + ":" + credentials.password).toString("base64");
            };
        }

        return headers;
    }

    // Note that this function has a reduced timeout.
    function shellyTryGet(route, node, credentials, timeout, callback, errorCallback){
        let data;
        return shellyTryRequest('GET', route, data, node, credentials, timeout, callback, errorCallback);
    }

    // Note that this function has a reduced timeout.
    function shellyTryRequest(method, route, data, node, credentials, timeout, callback, errorCallback){
    
        if(timeout === undefined || timeout === null){
            timeout = 5000;
        };

        // We avoid an invalid timeout by taking a default if 0.
        let requestTimeout = timeout;
        if(requestTimeout <= 0){
            requestTimeout = 5000;
        }

        let headers = getHeaders(credentials);

        let baseUrl = 'http://' + credentials.hostname;
        let config = {
            baseURL :  baseUrl,
            url : route,
            method : method,
            data : data,
            headers : headers,
            timeout: requestTimeout,
            validateStatus : (status) => status === 200 || status === 401
        };
        try
        {
            const request = axios.request(config);

            request.then(response => {
                if(response.status == 200){
                    callback(response.data);
                }
                else if(response.status == 401){
                    config.headers = {
                        'Authorization': getDigestAuthorization(response, credentials, config)
                    }

                    const digestRequest = axios.request(config);
                    digestRequest.then(response => {
                        if(response.status == 200){
                            callback(response.data);
                        }
                        else {
                            node.status({ fill: "red", shape: "ring", text: "Error: " + response.statusText });
                            node.warn("Error: " + response.statusText  + ' ' + config.url);
                        }
                    })
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
        catch(error2) {
            errorCallback(error2);
        }
    }

    // generic REST request wrapper with promise
    function shellyRequestAsync(method, route, data, credentials, timeout){
        return new Promise(function (resolve, reject) {

            if(timeout === undefined || timeout === null){
                timeout = 5000;
            };

            // We avoid an invalid timeout by taking a default if 0.
            let requestTimeout = timeout;
            if(requestTimeout <= 0){
                requestTimeout = 5000;
            }

            let headers = getHeaders(credentials);

            let baseUrl = 'http://' + credentials.hostname;
            let config = {
                baseURL :  baseUrl,
                url : route,
                method : method,
                data : data,
                headers : headers,
                timeout: requestTimeout,
                validateStatus : (status) => status === 200 || status === 401
            };

            try
            {
                const request = axios.request(config);
        
                request.then(response => {
                    if(response.status == 200){
                        resolve(response.data)
                    } else if(response.status == 401){
                        config.headers = {
                            'Authorization': getDigestAuthorization(response, credentials, config)
                        }
        
                        const digestRequest = axios.request(config);
                        digestRequest.then(response => {
                            if(response.status == 200){
                                resolve(response.data)
                            }
                            else {
                                reject(response.statusText + ' ' + config.url);
                            }
                        })
                    } else {
                        reject(response.statusText);
                    }
                })
                .catch(error => {
                    reject(error);
                });
            }
            catch(error2) {
                reject(error2);
            }
        });
    }


    function shellyPing(node, credentials, types){

        // gen 1 and gen 2 devices support this endpoint (gen 2 return the same info for /rpc/Shelly.GetDeviceInfo)
        shellyTryGet('/shelly', node, credentials, node.pollInterval, function(body) {
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
            node.status({ fill: "red", shape: "ring", text: "Ping: " + error.message });
            // node.warn(error.message); Removed as this would flood the output.
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
            resolve();
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
                        let timeout = 60000; // download can take very long of there is a lot of data.
                        let body = await shellyRequestAsync('GET', downloadRoute, null, credentials, timeout);
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

            let nodeMode = node.rgbwMode;
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

        let success = false;
        try {
            let credentials = getCredentials(node);
    
            let settingsRoute = '/settings';   
            let settings = await shellyRequestAsync('GET', settingsRoute, null, credentials);
            
            node.rgbwMode = settings.mode;

            success = initializer1WebhookAsync(node, types);
        }
        catch (error) {
            node.status({ fill: "red", shape: "ring", text: "Failed to get mode from settings."});
            node.warn("Failed to get mode from settings.", error);
        }

        return success;
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

        const sender = node.hostname;
        await tryUninstallWebhook1Async(node, sender); // we ignore if it failed
            
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
            success = await tryInstallWebhook1Async(node, webhookUrl, sender);
        }
        else{
            // nothing to do.
            success = true;
        }

        return success;
    }

    // Installs a webhook.
    async function tryInstallWebhook1Async(node, webhookUrl, sender){
        let success = false;
        if(node.hostname !== ''){    

            node.status({ fill: "yellow", shape: "ring", text: "Installing webhook..." });

            let credentials = getCredentials(node);

            let hookTypes = getHookTypes1(node.deviceType);

            // delete http://192.168.33.1/settings/actions?index=0&name=report_url&urls[]=
            // create http://192.168.33.1/settings/actions?index=0&name=report_url&enabled=true&urls[]=http://192.168.1.4/webhook
            try {

                if (hookTypes[0] !== undefined && hookTypes[0].action === '*'){
                    hookTypes = await getHookTypesFromDevice1(node);
                }

                if(hookTypes.length !== 0){
                    for (let i = 0; i < hookTypes.length; i++) {
                        let hookType = hookTypes[i];
                        let name = hookType.action;
                        let index = hookType.index;

                        let url = webhookUrl + '?data=' + name + '?' + index + '?' + sender; // note that & can not be used in gen1!!!
                        let deleteRoute = '/settings/actions?index=' + index + '&name=' + name + '&enabled=false&urls[]=';
                        try {
                            let timeout = node.pollInterval;
                            let deleteResult = await shellyRequestAsync('GET', deleteRoute, null, credentials, timeout);
                            let actionsAfterDelete = deleteResult.actions[name][0];
                            if(actionsAfterDelete.enabled === false) {
                                // 1st try to set the action using the standard method
                                let createRoute = '/settings/actions?index=' + index + '&name=' + name + '&enabled=true&urls[]=' + url;
                                let createResult = await shellyRequestAsync('GET', createRoute, null, credentials, timeout);
                                let actionsAfterCreate = createResult.actions[name][0];

                                if(actionsAfterCreate.enabled === true &&
                                    actionsAfterCreate.urls.indexOf(url) > -1) {
                                    node.status({ fill: "green", shape: "ring", text: "Connected." });
                                    success = true;
                                }
                                else {
                                    // 2nd: maybe the device supports intervals
                                    let createRoute2 = '/settings/actions?index=' + index + '&name=' + name + '&enabled=true&urls[0][url]=' + url + '&urls[0][int]=0000-0000';
                                    let createResult2 = await shellyRequestAsync('GET', createRoute2, null, credentials, timeout);
                                    let actionsAfterCreate2 = createResult2.actions[name][0];
                                    if(actionsAfterCreate2.enabled === true) {

                                        if(actionsAfterCreate2.urls[0].url === url) {
                                            node.status({ fill: "green", shape: "ring", text: "Connected." });
                                            success = true;
                                        }
                                        else {
                                            console.warn("Failed to install webhook " + name + " for " + sender);
                                            success = false;
                                            break;
                                        }
                                    }
                                    else {
                                        console.warn("Failed to install webhook " + name + " for " + sender);
                                        success = false;
                                        break;
                                    }
                                }
                            }
                            else {
                                console.warn("Failed to delete webhook " + name + " for " + sender);
                                success = false;
                                break;
                            }
                        }
                        catch (error) {
                            node.status({ fill: "yellow", shape: "ring", text: "Installing webhook...." });
                        }
                    };
                }
                else
                {
                    node.status({ fill: "red", shape: "ring", text: "Device does not support callbacks" });
                    node.warn("Installing webhook failed (" + sender + ") " + error);
                }
            }
            catch (error) {
                // node.warn("Installing webhook failed (" + sender + ") " + error);
                // node.status({ fill: "red", shape: "ring", text: "Installing webhook failed "});
            }     
        }
        else {
            node.status({ fill: "red", shape: "ring", text: "Hostname not configured" });
        }

        return success;
    }
    
    // Uninstalls a webhook.
    async function tryUninstallWebhook1Async(node, sender){
        let success = false;
        if(node.hostname !== ''){    

            // node.status({ fill: "yellow", shape: "ring", text: "Uninstalling webhook..." });

            let credentials = getCredentials(node);

            let hookTypes = getHookTypes1(node.deviceType);

            // delete http://192.168.33.1/settings/actions?index=0&name=report_url&urls[]=
            try {

                if (hookTypes[0] !== undefined && hookTypes[0].action === '*'){
                    hookTypes = await getHookTypesFromDevice1(node);
                }

                if(hookTypes.length !== 0){
                    for (let i = 0; i < hookTypes.length; i++) {
                        let hookType = hookTypes[i];
                        let name = hookType.action;
                        let index = hookType.index;
                        let urls = hookType.urls;

                        // We only delete the hook from us: find the sender url in the hook url.
                        for (let j = 0; j < urls.length; j++) {
                            let url = urls[i];

                            // This is a vage assumption but it is the best we have at the moment to identify our hooks. 
                            if(url.includes(sender)) {
                                let deleteRoute = '/settings/actions?index=' + index + '&name=' + name + '&enabled=false&urls[]=';
                                try {
                                    let timeout = node.pollInterval;
                                    let deleteResult = await shellyRequestAsync('GET', deleteRoute, null, credentials, timeout);
                                    let actionsAfterDelete = deleteResult.actions[name][0];
                                    if(actionsAfterDelete.enabled === false) {
                                        // failed
                                    }
                                    else {
                                        console.warn("Failed to delete webhook " + name + " for " + sender);
                                        success = false;
                                        break;
                                    }
                                }
                                catch (error) {
                                    // node.status({ fill: "yellow", shape: "ring", text: "Uninstalling webhook...." });
                                }
                            }
                        }
                    };
                }
                else
                {
                    node.status({ fill: "red", shape: "ring", text: "Device does not support callbacks" });
                    node.warn("Installing webhook failed (" + sender + ") " + error);
                }
            }
            catch (error) {
                // node.warn("Installing webhook failed (" + sender + ") " + error);
                // node.status({ fill: "red", shape: "ring", text: "Uninstalling webhook failed "});
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
            case 'Measure':
            case 'Roller':
            case 'Dimmer':
            case 'Sensor':
            case 'Thermostat':
            case 'Button':
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
        ["Relay",      ["SHSW-", "SHPLG-", "SHUNI-", "SHEM", "SHPLG2-"]],
        ["Measure",    ["SHEM"]], // here no - as the device is only SHEM
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

    let gen1HookTypes = new Map([
        ["Relay",      [{ action : "*", index : 0 }]],
        ["Measure",    [{ action : "*", index : 0 }]],
        ["Roller",     [{ action : "*", index : 0 }]],
        ["Dimmer",     [{ action : "*", index : 0 }]],
        ["Thermostat", [{ action : "*", index : 0 }]],
        ["Sensor",     [{ action : "*", index : 0 }]],
        ["Button",     [{ action : "*", index : 0 }]],
        ["RGBW",       [{ action : "*", index : 0 }]],
    ]);

    function getHookTypes1(deviceType){
        let hookTypes = gen1HookTypes.get(deviceType);
        if(hookTypes === undefined){
            hookTypes = []; 
        }

        return hookTypes;
    }

    async function getHookTypesFromDevice1(node){
        let credentials = getCredentials(node);

        let actionsRoute = '/settings/actions';
        let result = await shellyRequestAsync('GET', actionsRoute, null, credentials);
        
        let hookTypes = [];
        let actions = Object.keys(result.actions);
        for (let i = 0; i < actions.length; i++) {
            let action = actions[i];
            let actionItems = result.actions[action];
            for (let j = 0; j < actionItems.length; j++) {
                let item = actionItems[j];
                let index = item.index;

                let hookType = {
                    action : action,
                    index : index,
                    urls : item.urls
                };
                hookTypes.push(hookType);
            }
        }

        return hookTypes;
    }

    function executeCommand1(msg, route, node, credentials){
        let getStatusRoute = '/status';
        if (route !== undefined && route !== ''){

            shellyTryGet(route, node, credentials, null, function(body) {
                if (node.getStatusOnCommand) {
                    shellyTryGet(getStatusRoute, node, credentials, null, function(body) {
                        
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

                    msg.payload = body;
                    node.send([msg]);
                }
            },
            function(error){
                node.status({ fill: "yellow", shape: "ring", text: error.message });
                node.warn(error.message);
            });
        }
        else {
            shellyTryGet(getStatusRoute, node, credentials, null, function(body) {
                    
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

    async function applySettings1Async(settings, node, credentials){
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
                        let body = await shellyRequestAsync('GET', settingRoute, null, credentials);
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
                    console.info("Shelly gen1 server is listening on port " + node.port);
                }
                else{
                    node.error("Shelly gen1 server failed to listen on port " + node.port);
                }
            })
    
            node.server.get("/webhook", (request, reply) => {
                let queryFields = request.query.data.split('?');
                let query = {
                    hookType : queryFields[0],
                    index : queryFields[1],
                    sender : queryFields[2],
                }
                let data = {
                    hookType : queryFields[0],
                    index : queryFields[1],
                    sender : queryFields[2],
                    event : query, // request.body is null
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
        
        if(config.uploadretryinterval !== undefined && config.uploadretryinterval !== '') {
            node.initializeRetryInterval = parseInt(config.uploadretryinterval);
        }
        else {
            node.initializeRetryInterval = 5000;
        }
      
        node.hostname = config.hostname.trim();
        node.authType = "Basic";
        node.pollInterval = parseInt(config.pollinginterval);
        node.pollStatus = config.pollstatus;
        node.getStatusOnCommand = config.getstatusoncommand;
        
        node.rgbwMode = 'color';

        let deviceType = config.devicetype;
        node.deviceType = deviceType;

        node.mode = config.mode;
        if (!node.mode || node.server === undefined || node.server === null) {
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
                let success = await applySettings1Async(settings, node, credentials);
         
                let route = await node.inputParser(msg, node, credentials);
                executeCommand1(msg, route, node, credentials);
            });

            
            // Callback mode:
            if(node.server !== null && node.server !== undefined && node.mode === 'callback') {
                node.onCallback = function (data) {
                    if(data.sender === node.hostname){
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
    
    // Uploads and enables a skript.
    async function tryInstallScriptAsync(node, script, scriptName){
        let success = false;
        if(node.hostname !== ''){    

            node.status({ fill: "yellow", shape: "ring", text: "Uploading script..." });

            let credentials = getCredentials(node);

            try {
                //// Remove all old scripts first
                //let scriptListResponse = await shellyRequestAsync('GET', '/rpc/Script.List', null, credentials);
                //for (let scriptItem of scriptListResponse.scripts) {
                //    if(scriptItem.name == scriptName){
                //        let deleteParams = { 'id' : scriptItem.id };
                //        await shellyRequestAsync('GET', '/rpc/Script.Delete', deleteParams, credentials);
                //    }
                //};

                let createParams = { 'name' : scriptName };
                let createScriptResonse = await shellyRequestAsync('GET', '/rpc/Script.Create', createParams, credentials);
                let scriptId = createScriptResonse.id;

                const chunkSize = 1024;
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
                    await shellyRequestAsync('POST', '/rpc/Script.PutCode', putParams, credentials);

                } while (!done);

                let configParams = {  
                    'id' : scriptId,
                    'config' : {'enable' : true}
                };
                await shellyRequestAsync('GET', '/rpc/Script.SetConfig', configParams, credentials);
               
                let startParams = {  
                    'id' : scriptId,
                };
                await shellyRequestAsync('POST', '/rpc/Script.Start', startParams, credentials);
               
                let statusParams = {  
                    'id' : scriptId,
                };
                let status = await shellyRequestAsync('GET', '/rpc/Script.GetStatus', statusParams, credentials);

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
                // node.error("Uploading script failed " + error);
                // node.status({ fill: "red", shape: "ring", text: "Uploading script failed "});
            }     
        }
        else {
            node.status({ fill: "red", shape: "ring", text: "Hostname not configured" });
        }

        return success;
    }
    
    async function tryUninstallScriptAsync(node, scriptName){
        let success = false;
        if(node.hostname !== ''){    

            let credentials = getCredentials(node);

            try {
                let scriptListResponse = await shellyRequestAsync('GET', '/rpc/Script.List', null, credentials);
            
                for (let scriptItem of scriptListResponse.scripts) {
                    if(scriptItem.name == scriptName){
                        let params = {  
                            'id' : scriptItem.id,
                        };
                        let status = await shellyRequestAsync('GET', '/rpc/Script.GetStatus', params, credentials);

                        if(status.running === true){
                            await shellyRequestAsync('POST', '/rpc/Script.Stop', params, credentials);
                        }

                        await shellyRequestAsync('GET', '/rpc/Script.Delete', params, credentials);
                    }
                };                
            }
            catch (error) {
                // node.error("Uninstalling script failed " + error);
                node.status({ fill: "red", shape: "ring", text: "Uninstalling script failed "});
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
            node.status({ fill: "yellow", shape: "ring", text: "Installing webhook..." });

            let credentials = getCredentials(node);

            try {
                // Remove all old webhooks async.
                let webhookListResponse = await shellyRequestAsync('GET', '/rpc/Webhook.List', null, credentials);
                for (let webhookItem of webhookListResponse.hooks) {
                    if(webhookItem.name == webhookName){
                        let deleteParams = { 'id' : webhookItem.id };
                        let deleteWebhookResonse = await shellyRequestAsync('GET', '/rpc/Webhook.Delete', deleteParams, credentials);
                    }
                };

                // Create new webhooks.
                let supportedEventsResponse = await shellyRequestAsync('GET', '/rpc/Webhook.ListSupported', null, credentials);
                for (let hookType of supportedEventsResponse.hook_types) {  
                    let sender = node.hostname;
                    let url = webhookUrl + '?hookType=' + hookType + '&sender=' + sender;
                    let createParams = { 
                        'name' : webhookName,
                        'event' : hookType,
                        'cid' : 0,
                        'enable' : true,
                        "urls": [url]
                    };
                    let createWebhookResonse = await shellyRequestAsync('GET', '/rpc/Webhook.Create', createParams, credentials);

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

    // Uninstalls a webhook.
    async function tryUninstallWebhook2Async(node, webhookName){
        let success = false;
        if(node.hostname !== ''){    
            node.status({ fill: "yellow", shape: "ring", text: "Installing webhook..." });

            let credentials = getCredentials(node);

            try {
                let webhookListResponse = await shellyRequestAsync('GET', '/rpc/Webhook.List', null, credentials);
            
                for (let webhookItem of webhookListResponse.hooks) {
                    if(webhookItem.name == webhookName){
                        let deleteParams = { 'id' : webhookItem.id };
                        let deleteWebhookResonse = await shellyRequestAsync('GET', '/rpc/Webhook.Delete', deleteParams, credentials);
                    }
                };
            }
            catch (error) {
                // node.warn("Uninstalling webhook failed " + error);
                // node.status({ fill: "red", shape: "ring", text: "Uninstalling webhook failed "});
            }     
        }
        else {
            node.status({ fill: "red", shape: "ring", text: "Hostname not configured" });
        }

        return success;
    }

    // Creates a route from the input.
    async function inputParserGeneric2Async(msg){
        
        let method = 'POST';
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
    function initializer2(node, types){
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

    // starts polling or uploads a skript that calls a REST callback.
    async function initializer2CallbackAsync(node, types){

        const scriptName = 'node-red-contrib-shelly';
        await tryUninstallScriptAsync(node, scriptName); // we ignore if it failed.
            
        let success = false;
        let mode = node.mode;
        if(mode === 'polling'){
            await startAsync(node, types);
            success = true;
        }
        else if(mode === 'callback'){
            let scriptPath = path.resolve(__dirname, './scripts/button.script');
            const buffer = await readFile(scriptPath);
            let script = buffer.toString();

            let ipAddress = localIpAddress;
            if(node.server.hostname !== undefined && node.server.hostname !== ''){
                ipAddress = node.server.hostname;
            }
            let url = 'http://' + ipAddress +  ':' + node.server.port + '/callback';
            script = script.replace('%URL%', url);
            let sender = node.hostname;
            script = script.replace('%SENDER%', sender);

            success = await tryInstallScriptAsync(node, script, scriptName);
        }
        else{
            // nothing to do.
            success = true;
        }

        return success;
    }

    // starts polling or installs a webhook that calls a REST callback.
    async function initializer2WebhookAsync(node, types){

        const webhookName = 'node-red-contrib-shelly';
        await tryUninstallWebhook2Async(node, webhookName); // we ignore if it failed.
            
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
        ["Relay",      ["SHSW-", "SNSW-", "SPSW-", "SNPL-"]],
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
    
            shellyTryRequest(method, route, data, node, credentials, null, function(body) {

                if (node.getStatusOnCommand) {
                    shellyTryGet(getStatusRoute, node, credentials, null, function(body) {
                        
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

                    msg.payload = body;
                    node.send([msg]);
                }
            },
            function(error){
                node.status({ fill: "yellow", shape: "ring", text: error.message });
                node.warn(error);
            });
        }
        else {
            shellyTryGet(getStatusRoute, node, credentials, null, function(body) {
                    
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
                    console.info("Shelly gen2 server is listening on port " + node.port);
                }
                else{
                    node.error("Shelly gen2 server failed to listen on port " + node.port);
                }
            })
    
            node.server.put("/callback", (request, reply) => {
                let data = {
                    sender : request.body.sender,
                    event : request.body.event,
                }
                node.emit('callback', data);
                reply.code(200);
                reply.send();
            });

            node.server.get("/webhook", (request, reply) => {
                let data = {
                    hookType : request.query.hookType,
                    sender : request.query.sender,
                    event : request.query, // request.body is null
                }
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
        
        if(config.uploadretryinterval !== undefined) {
            node.initializeRetryInterval = parseInt(config.uploadretryinterval);
        }
        else {
            node.initializeRetryInterval = 5000;
        }
        
        node.hostname = config.hostname.trim();
        node.authType = "Digest";
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
                    if(data.sender === node.hostname){
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


    // CLOUD API ----------------------------------------------------------------------------------
    // see https://shelly-api-docs.shelly.cloud/cloud-control-api/

    function encodeParams(data){
        Object.keys(data).forEach(key => data[key] === undefined && delete data[key]);
        let params = new URLSearchParams(data).toString();
        return params;
    };

    function encodeArrayParams(data){
        let params = JSON.stringify(data);
        return params;
    };

    // generic REST cloud request wrapper with promise
    function shellyCloudRequestAsync(method, route, data, credentials, timeout){
        return new Promise(function (resolve, reject) {

            if(timeout === undefined || timeout === null){
                timeout = 10000;
            };

            // We avoid an invalid timeout by taking a default if 0.
            let requestTimeout = timeout;
            if(requestTimeout <= 0){
                requestTimeout = 10000;
            }

            let encodedData = 'auth_key=' + credentials.authKey;
            if (data !== undefined && data !== null) {
                encodedData += '&' + data;
            }

            let baseUrl = credentials.serverUri;
            let config = {
                baseURL :  baseUrl,
                url : route,
                method : method,
                data : encodedData,
                timeout: requestTimeout,
                validateStatus : (status) => status === 200
            };

            try
            {
                const request = cloudAxios.request(config);
        
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
            }
            catch(error2) {
                reject(error2);
            }
        });
    }

    // --------------------------------------------------------------------------------------------
    // The shelly cloud server node
    function ShellyCloudServerNode(config) {
        RED.nodes.createNode(this, config);

        let node = this;

        node.serverUri = node.credentials.serveruri.trim();
        node.authKey = node.credentials.authkey.trim();

        this.getCredentials = function () {
            const credentials = {
                serverUri : node.serverUri,
                authKey : node.authKey
            };

            return credentials;
        };
    }
    RED.nodes.registerType('shelly-cloud-server', ShellyCloudServerNode, {
        credentials: {
            serveruri: { type: "text" },
            authkey: { type: "password" },
        },
    });


    // --------------------------------------------------------------------------------------------
    // The shelly node controls a shelly via cloud api.
    function ShellyCloudNode(config) {
        RED.nodes.createNode(this, config);
        let node = this;
        
        node.server = RED.nodes.getNode(config.server);
       
        node.status({});

        this.on('input', async function (msg) {

            try {
                let route;
                let params;
                if (msg.payload !== undefined && msg.payload !== null) {

                    let type = msg.payload.type;
                    if (type === 'light'){
                        route = '/device/light/control';

                        let data = {
                            id : msg.payload.id,
                            channel : msg.payload.channel,
                            turn : msg.payload.turn,
                            brightness : msg.payload.brightness,
                            white : msg.payload.white,
                            red : msg.payload.red,
                            green : msg.payload.green,
                            blue : msg.payload.blue,
                            gain : msg.payload.gain,
                        };
                        params = encodeParams(data);
                    } else if (type === 'relay'){
                        route = '/device/relay/control';
                   
                        let data = {
                            id : msg.payload.id,
                            channel : msg.payload.channel,
                            turn : msg.payload.turn,
                        };
                        params = encodeParams(data);
                    } else if (type === 'roller'){
                        route = '/device/relay/roller/control';
                    
                        let data = {
                            id : msg.payload.id,
                            channel : msg.payload.channel,
                            direction : msg.payload.direction,
                            pos : msg.payload.pos,
                        };    
                        params = encodeParams(data);    
                    } else if (type === 'relays'){
                        route = '/device/relay/bulk_control';

                        let data = {
                            turn : msg.payload.turn
                        };    
                        params = encodeParams(data);
                        params += '&devices=' + encodeArrayParams(msg.payload.devices); 
                    } else if (type === 'status'){
                        route = '/device/status';

                        let data = {
                            id : msg.payload.id
                        };    
                        params = encodeParams(data);  
                    }
                    else {
                        // nothing to do
                    }
                }

                if (route) {
                    let credentials = node.server.getCredentials();
                    let body = await shellyCloudRequestAsync('POST', route, params, credentials);
    
                    node.status({ fill: "green", shape: "ring", text: "OK" });
    
                    let status = body;
                    // msg.status = status;
                    msg.payload = status;
                    node.send([msg]);
                }
                else {
                    node.send([msg]);
                }
            }
            catch (error) {
                node.status({ fill: "red", shape: "ring", text: error});
                node.error("Failed to get status: " + error, error);
            }
        });
        
        this.on('close', function(done) {
            node.status({});
            done();
        });
    }
    RED.nodes.registerType("shelly-cloud", ShellyCloudNode, {
    });
}