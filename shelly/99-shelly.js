/**
* Created by Karl-Heinz Wind
* see also https://shelly-api-docs.shelly.cloud/#common-http-api
**/

module.exports = function (RED) {
    "use strict";
    var axios = require('axios').default;
      
    // generic REST get wrapper
    function shellyGet(route, node, hostname, callback){

        let headers = {};
        if(node.credentials.username !== undefined && node.credentials.password !== undefined) {
            headers.Authorization = "Basic " + Buffer.from(node.credentials.username + ":" + node.credentials.password).toString("base64");
        };

        let url = 'http://';
        if(hostname === undefined){
            url += node.hostname;
        }
        else {
            url += hostname;
        }
        url += route;

        const request = axios.get(url, {
            headers : headers
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
            node.status({ fill: "red", shape: "ring", text: "Error: " + error });
        });
    }

    // Note that this function has a reduced timeout.
    function shellyTryGet(route, node, timeout, hostname, callback, errorCallback){

        // We avoid an invalid timeout by taking a default if 0.
        let requestTimeout = timeout;
        if(requestTimeout <= 0){
            requestTimeout = 5000;
        }

        let headers = {};
        if(node.credentials.username !== undefined && node.credentials.password !== undefined) {
            headers.Authorization = "Basic " + Buffer.from(node.credentials.username + ":" + node.credentials.password).toString("base64");
        };

        let url = 'http://';
        if(hostname === undefined){
            url += node.hostname;
        }
        else {
            url += hostname;
        }
        url += route;

        const request = axios.get(url, {}, {
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
    function shellyGetAsync(route, node, hostname){
        return new Promise(function (resolve, reject) {

            let headers = {};
            if(node.credentials.username !== undefined && node.credentials.password !== undefined) {
                headers.Authorization = "Basic " + Buffer.from(node.credentials.username + ":" + node.credentials.password).toString("base64");
            };

            let url = 'http://';
            if(hostname === undefined){
                url += node.hostname;
            }
            else {
                url += hostname;
            }
            url += route;
            
            const request = axios.get(url, {}, {
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

    function shellyPing(node, types){
        shellyGet('/shelly', node, node.hostname, function(body) {
            node.shellyInfo = body;

            var found = false;
            for (var i = 0; i < types.length; i++) {
                var type = types[i];

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
                node.status({ fill: "red", shape: "ring", text: "Shelly type " + node.shellyInfo.type + " is not known." });
            }
        });
    }

    // Starts polling the status.
    function start(node, types){
        if(node.hostname !== ''){    
            shellyPing(node, types);

            if(node.pollInterval > 0) {
                node.timer = setInterval(function() {
                    shellyPing(node, types);

                    if(node.pollStatus){
                        node.emit("input", {});
                    }    
                }, node.pollInterval);
            }
        }
        else {
            node.status({ fill: "red", shape: "ring", text: "Hostname not configured" });
        }
    }

    // --------------------------------------------------------------------------------------------
    // The switch node controls a shelly switch.
    function ShellySwitchNode(config) {
        RED.nodes.createNode(this, config);
        var node = this;
        node.hostname = config.hostname.trim();
        node.pollInterval = parseInt(config.pollinginterval);
        node.pollStatus = config.pollstatus || false;

        /* node.shellyInfo
        GET /shelly
        {
            "type": "SHSW-21",
            "mac": "5ECF7F1632E8",
            "auth": true,
            "fw": "20161223-111304/master@2bc16496",
            "num_outputs": 1
        }
        */

        var types = ["SHPLG-", "SHSW-", "SHUNI-"];
        start(node, types);

        /* when a payload is received in the format
            {
                relay : 0,
                on : true
            }
            or in alternative format 
            {
                relay : 0,
                turn : on/off/toggle
            }
        then the command is send to the shelly.

        The output gets the status of all relays.
        */
        this.on('input', function (msg) {

            var hostname;
            var route = '';
            if(msg.payload !== undefined){
                hostname = msg.payload.hostname;
                var command = msg.payload;

                var relay = 0;
                if(command.relay !== undefined){
                    relay = command.relay;
                }

                var turn;
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

            if (route !== ''){
                shellyGet(route, node, hostname, function(body) {
                    shellyGet('/status', node, hostname, function(body) {

                        node.status({ fill: "green", shape: "ring", text: "Connected." });

                        var status = body;
                        msg.status = status;
                        msg.payload = status.relays;
                        node.send([msg]);
                    });
                });
            }
            else {
                shellyGet('/status', node, hostname, function(body) {

                    node.status({ fill: "green", shape: "ring", text: "Connected." });
                        
                    var status = body;
                    msg.status = status;
                    msg.payload = status.relays;
                    node.send([msg]);
                });
            }
        });

        this.on('close', function(done) {
            clearInterval(node.timer);
            done();
        });
    }
    RED.nodes.registerType("shelly-switch", ShellySwitchNode, {
        credentials: {
            username: { type: "text" },
            password: { type: "password" },
        }
    });


    // --------------------------------------------------------------------------------------------
    // The door node controls a shelly door device.
    /* The device can disconnect but wakes up when the switch changes the state or after every 4-5 minutes
    GET /status
    {
        "wifi_sta":{"connected":true,"ssid":"...","ip":"192.168.178.146","rssi":-62},
        "cloud":{"enabled":true,"connected":true},
        "mqtt":{"connected":false},
        "time":"15:22",
        "serial":19,
        "has_update":false,
        "mac":"98F4ABB88DB4",
        "is_valid":true,

        "lux":{"value":66, "illumination": "dark", "is_valid":true},
        "sensor":{"state":"close", "is_valid":true},
        "bat":{"value":99,"voltage":5.92},

        "act_reasons":["poweron","sensor"],
        "update":{"status":"idle","has_update":false,"new_version":"20191216-090511/v1.5.7@c30657ba","old_version":"20191216-090511/v1.5.7@c30657ba"},
        "ram_total":50592,
        "ram_free":40308,
        "fs_size":233681,
        "fs_free":162648,
        "uptime":66
    }
    */
    function ShellyDoorNode(config) {
        RED.nodes.createNode(this, config);
        var node = this;
        node.hostname = config.hostname.trim();
        node.usePolling = config.usepolling;
        node.pollInterval = parseInt(config.pollinginterval);

        // Not used right now.
        // var types = ["SHDW"];

        if(node.usePolling){
            node.timer = setInterval(function() {
                node.emit("input", {});
            }, node.pollInterval);

            node.status({ fill: "yellow", shape: "ring", text: "Status unknown: polling ..." });
        }
        else{
            node.status({ fill: "yellow", shape: "ring", text: "Status unknown: waiting for trigger ..." });
        }

        this.on('input', function (msg) {

            var hostname;
            if(msg.payload !== undefined){
                hostname = msg.payload.hostname;
                node.status({ fill: "green", shape: "dot", text: "Status unknown: updating ..." });
            }

            shellyTryGet('/status', node, node.pollInterval, hostname, function(body) {
                var status = body;
                var timestamp=new Date().toLocaleTimeString();

                if(status.sensor !== undefined && status.sensor.is_valid){
                    node.status({ fill: "green", shape: "ring", text: "Status: " + status.sensor.state + " " + timestamp});
                }
                else {
                    node.status({ fill: "red", shape: "ring", text: "Status: invalid" });
                }

                msg.status = status;
                msg.payload = {
                    sensor : status.sensor,
                    lux : status.lux,
                    bat :  status.bat,
                };
                
                node.send([msg]);
            },
            function(error){
                if(msg.payload){
                    node.status({ fill: "yellow", shape: "ring", text: "Status unknown: device not reachable." });
                }
            });
        });

        this.on('close', function(done) {
            clearInterval(node.timer);
            done();
        });
    }

    RED.nodes.registerType("shelly-door", ShellyDoorNode, {
        credentials: {
            username: { type: "text" },
            password: { type: "password" },
        }
    });


    // --------------------------------------------------------------------------------------------
    // The roller shutter node controls a shelly roller shutter (2.5).
    function ShellyRollerShutterNode(config) {
        RED.nodes.createNode(this, config);
        var node = this;
        node.hostname = config.hostname.trim();
        node.pollInterval = parseInt(config.pollinginterval);
        node.pollStatus = config.pollstatus || false;

        /* node.shellyInfo
        GET /shelly
        {
            "type": "SHSW-21",
            "mac": "5ECF7F1632E8",
            "auth": true,
            "fw": "20161223-111304/master@2bc16496",
            "num_outputs": 1
        }
        */

        var types = ["SHPLG-", "SHSW-"];
        start(node, types);   

        /* when a payload is received in the format
            {
                roller : 0,
                on : true
            }
        then the command is send to the shelly.

        The output gets the status of all rollers.
        */
        /* when a payload is received in the format
            {
                relay : 0,
                on : true
            }
            or in alternative format 
            {
                relay : 0,
                turn : on/off/toggle
            }
        then the command is send to the shelly.
        */

        this.on('input', function (msg) {

            var hostname;
            var route = '';
            if(msg.payload !== undefined){
                hostname = msg.payload.hostname;
                var command = msg.payload;

                var roller = 0;
                if(command.roller !== undefined){
                    roller = command.roller;
                }

                var go;
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
                    var relay = 0;
                    if(command.relay !== undefined){
                        relay = command.relay;
                    }
    
                    var turn;
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

            if (route !== ''){
                shellyGet(route, node, hostname, function(body) {
                    shellyGet('/status', node, hostname, function(body) {

                        node.status({ fill: "green", shape: "ring", text: "Connected." });

                        var status = body;
                        msg.status = status;
                        msg.payload = {
                            rollers : status.rollers,
                            relays : status.relays,
                            meters : status.meters
                        };
                        node.send([msg]);
                    });
                });
            }
            else{
                shellyGet('/status', node, hostname, function(body) {

                    node.status({ fill: "green", shape: "ring", text: "Connected." });

                    var status = body;
                    msg.status = status;
                    msg.payload = {
                        rollers : status.rollers,
                        relays : status.relays,
                        meters : status.meters
                    };
                    node.send([msg]);
                });
            }
        });

        this.on('close', function(done) {
            clearInterval(node.timer);
            done();
        });
    }
    RED.nodes.registerType("shelly-roller-shutter", ShellyRollerShutterNode, {
        credentials: {
            username: { type: "text" },
            password: { type: "password" },
        }
    });


    // --------------------------------------------------------------------------------------------
    // The dimmer node controls a shelly dimmer or Shelly Duo.
    function ShellyDimmerNode(config) {
        RED.nodes.createNode(this, config);
        var node = this;
        node.hostname = config.hostname.trim();
	    node.dimmerStat = config.dimmerStat || false;
        node.pollInterval = parseInt(config.pollinginterval);
        node.pollStatus = config.pollstatus || false;

        /* node.shellyInfo
        GET /shelly
        {
           "type":"SHDM-1",
           "mac":"CC50E3F36XXX",
           "auth":false,
           "fw":"20200309-104554/v1.6.0@43056d58",
           "num_outputs":1,
           "num_meters":1
        }
        */

        var types = ["SHDM-", "SHBDUO-1"];
        start(node, types);

        /* when a payload is received in the format
            {
                light : 0,
                on : true,
                brightness : 75,
                white : 100 // optional for Duo
                transition : 0 // optional for Duo
                temp : 2700 // optional for Duo
            }
            or in alternative format 
            {
                relay : 0,
                turn : on/off/toggle,
                brightness : 75
            }
        then the command is send to the shelly.

        The output gets the status of all relays.
        */
        this.on('input', function (msg) {

            var hostname;
            var route = '';
            if(msg.payload !== undefined){
                hostname = msg.payload.hostname;
                var command = msg.payload;

                var light = 0;
                if(command.light !== undefined){
                    light = command.light;
                }

                var turn;
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

                var brightness;
                if(command.brightness !== undefined){
                    if(command.brightness >=1 && command.brightness <= 100){
                        brightness = command.brightness;
                  } else { 
                      brightness = 100;  // Default to full brightness
                  }
                }

                var white;
                if(command.white !== undefined){
                    if(command.white >=1 && command.white <= 100){
                        white = command.white;
                  } else { 
                      // Default is undefined
                  }
                }

                var temperature;
                if(command.temp !== undefined){
                    if(command.temp >=2700 && command.temp <= 6500){
                        temperature = command.temp;
                  } else { 
                      // Default is undefined
                  }
                }

                var transition;
                if(command.transition !== undefined){
                    if(command.transition >=0 && command.transition <= 5000){
                        transition = command.transition;
                  } else { 
                      // Default is undefined
                  }
                }


                if (turn !== undefined && brightness !== undefined){
                  route = "/light/" + light + "?turn=" + turn + "&brightness=" + brightness;
                }
                else if (brightness !== undefined){
                    route = "/light/" + light + "?brightness=" + brightness;
                }
                else if (turn !== undefined){
                    route = "/light/" + light + "?turn=" + turn;
                }

                if (route !== '') {
                    if(white !== undefined) {
                        route += "&white=" + white;
                    }

                    if(temperature !== undefined) {
                        route += "&temp=" + temperature;
                    }

                    if(transition !== undefined) {
                        route += "&transition=" + transition;
                    }
                }
            }

            if (route !== '') {
                shellyGet(route, node, hostname, function(body) {
		            if (node.dimmerStat) {
			            shellyGet('/status', node, hostname, function(body) {

                            node.status({ fill: "green", shape: "ring", text: "Connected." });

                            var status = body;
                            msg.status = status;
                            msg.payload = status.lights;
                            node.send([msg]);
			            });
		            }
                });
            }
            else {
                shellyGet('/status', node, hostname, function(body) {

                    node.status({ fill: "green", shape: "ring", text: "Connected." });

                    var status = body;
                    msg.status = status;
                    msg.payload = status.lights;
                    node.send([msg]);
                });
            }
        });

        this.on('close', function(done) {
            clearInterval(node.timer);
            done();
        });
    }
    RED.nodes.registerType("shelly-dimmer", ShellyDimmerNode, {
        credentials: {
            username: { type: "text" },
            password: { type: "password" },
        }
    });


    // --------------------------------------------------------------------------------------------
    // The RGBW2 node controls a shelly LED stripe or a shelly builb RGBW.
    function ShellyRGBW2Node(config) {
        RED.nodes.createNode(this, config);
        var node = this;
        node.hostname = config.hostname.trim();
        node.ledStat = config.ledStat || false;
        node.pollInterval = parseInt(config.pollinginterval);
        node.pollStatus = config.pollstatus || false;
        node.mode = config.mode;
        
        /* node.shellyInfo
        GET /shelly
        {
            "type":"SHRGBW2",
            "mac":"E868E7811D20",
            "auth":true,
            "fw":"20201124-092159/v1.9.0@57ac4ad8",
            "num_outputs":1
        }
        */

        var types = ["SHRGBW2", "SHCB-1"];
        start(node, types);

        /* when a payload is received in the format
            {
                mode : 'color'
                red : 0,
                green : 0,
                blue : 0,
                on : true,
                timer : 0,
                white : 75,
                gain: 100,
                effect: 1,
                brightness: 100 // optional fpr bulb
                temp: 3000 // optional for bulb
            }

            or

            {
                mode : 'white'
                light : 0,
                brightness : 100,
                on: true,
                timer : 0
            }
        then the command is send to the shelly.
        */

        if(node.hostname !== undefined){
            var mode = node.mode;
            if(mode === "color" || mode === "white"){
                shellyGet('/settings?mode=' + mode, node, node.hostname, function(body) {
                    var result = body;
                    // here we can not check if the mode is already changed so we can not display a proper status.
                });
            }
        }
        
        this.on('input', async function (msg) {

            var hostname;
            var route = '';
            if(msg.payload !== undefined) {
                hostname = msg.payload.hostname;
                var command = msg.payload;

                var nodeMode;
                if(command.mode !== undefined) {
                    nodeMode = command.mode;

                    if (node.mode === 'auto') {
                        try {
                            let body = await shellyGetAsync('/settings?mode=' + nodeMode, node, hostname);
                        }
                        catch (error) {
                            node.error("Failed to set mode to: " + nodeMode, error);
                            node.status({ fill: "red", shape: "ring", text: "Failed to set mode to: " + nodeMode});
                        }
                    }
                }
                else {
                    nodeMode = node.mode;
                }

                if(nodeMode === "color") {

                    var red;
                    if(command.red !== undefined) {
                        if(command.red >= 0 && command.red <= 255) {
                            red = command.red;
                        } else {
                            red = 255;  // Default to full brightness
                        }
                    }

                    var green;
                    if (command.green !== undefined) {
                        if (command.green >= 0 && command.green <= 255) {
                            green = command.green;
                        } else {
                            green = 255;  // Default to full brightness
                        }
                    }

                    var blue ;
                    if(command.blue !== undefined){
                        if (command.blue >= 0 && command.blue <= 255){
                            blue = command.blue;
                        } else {
                            blue = 255;  // Default to full brightness
                        }
                    }

                    var white;
                    if(command.white !== undefined) {
                        if (command.white >= 0 && command.white <= 255) {
                            white = command.white;
                        } else {
                            white = 255;  // Default to full brightness
                        }
                    }

                    var temperature;
                    if(command.temp !== undefined) {
                        if (command.temp >= 3000 && command.temp <= 6500) {
                            temperature = command.temp;
                        } else {
                            // Default is undefined
                        }
                    }

                    var gain;
                    if (command.gain !== undefined) {
                        if (command.gain >= 0 && command.gain <= 100) {
                            gain = command.gain;
                        } else {
                            gain = 100;  // Default to full gain
                        }
                    }

                    var brightness;
                    if (command.brightness !== undefined) {
                        if (command.brightness >= 0 && command.brightness <= 100) {
                            brightness = command.brightness;
                        } else {
                            // Default to undefined
                        }
                    }

                    var effect;
                    if (command.effect !== undefined) {
                        if (command.effect >=0) {
                            effect = command.effect;
                        } else {
                            effect = 0  // Default to no effect
                        }
                    }

                    var transition;
                    if (command.transition !== undefined) {
                        if (command.transition >= 0 && command.transition <= 5000) {
                            transition = command.transition;
                        } else {
                            // Default is undefined
                        }
                    }

                    var timer;
                    if (command.timer !== undefined) {
                        if (command.timer >=0) {
                            timer = command.timer;
                        } else {
                            timer = 0  // Default to no timer
                        }
                    }

                    var turn;
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

                    // prevend empty input being used as valid command.
                    if(route === "/color/0?turn=on" &&  
                        gain === undefined &&
                        red === undefined &&
                        green === undefined &&
                        blue === undefined &&
                        white === undefined &&
                        effect === undefined &&
                        timer === undefined){
                            route = undefined;
                        }
                }
                else if(nodeMode === "white") {

                    var light;
                    if (command.light !== undefined) {
                        if (command.light >=0) {
                            light = command.light;
                        } else {
                            light = 0  // Default to no 0
                        }
                    }

                    var brightness;
                    if (command.brightness !== undefined) {
                        if (command.brightness >= 0 && command.brightness <= 100) {
                            brightness = command.brightness;
                        } else {
                            brightness = 100;  // Default to full brightness
                        }
                    }

                    var temperature;
                    if(command.temp !== undefined) {
                        if (command.temp >= 3000 && command.temp <= 6500) {
                            temperature = command.temp;
                        } else {
                            // Default is undefined
                        }
                    }

                    var transition;
                    if (command.transition !== undefined) {
                        if (command.transition >= 0 && command.transition <= 5000) {
                            transition = command.transition;
                        } else {
                            // Default is undefined
                        }
                    }

                    var timer;
                    if (command.timer !== undefined) {
                        if (command.timer >=0) {
                            timer = command.timer;
                        } else {
                            timer = 0  // Default to no timer
                        }
                    }

                    var turn;
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
                    if (light !== undefined) {
                        route = "/white/" + light + "?turn=" + turn;
                    }
                    else {
                        route = "/white/0?turn=" + turn;  
                    }

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
            
                if (route !== ''){
                    shellyGet(route, node, hostname, function(body) {
                        if (node.ledStat) {
                            shellyGet('/status', node, hostname, function(body) {

                                node.status({ fill: "green", shape: "ring", text: "Connected." });

                                var status = body;
                                msg.status = status;
                                msg.payload = status.lights;
                                node.send([msg]);
                            });
                        }
                    });
                }
                else {
                    shellyGet('/status', node, hostname, function(body) {

                        node.status({ fill: "green", shape: "ring", text: "Connected." });

                        var status = body;
                        msg.status = status;
                        msg.payload = status.lights;
                        node.send([msg]);
                    });
                }
            }
        });

        this.on('close', function(done) {
            clearInterval(node.timer);
            done();
        });
    }

    RED.nodes.registerType("shelly-rgbw2", ShellyRGBW2Node, {
        credentials: {
            username: { type: "text" },
            password: { type: "password" },
        }
    });


    // --------------------------------------------------------------------------------------------
    // The motion node controls a shelly motion device.
    /* The device can disconnect but wakes up when the switch changes the state or after every 4-5 minutes
    GET /status
    {
        lux: 
            value: 88
            illumination: "dark"
            is_valid: true
        sensor: 
            motion: true
            vibration: false
            timestamp: 1626034808
            active: true
            is_valid: true
        bat:
            value: 100
            voltage: 4.207
            charger: true
    }
    */
    function ShellyMotionNode(config) {
        RED.nodes.createNode(this, config);
        var node = this;
        node.hostname = config.hostname.trim();
        node.pollInterval = parseInt(config.pollinginterval);

        let hasextraoutputs = config.hasextraoutputs;
        if (hasextraoutputs === undefined) {
            hasextraoutputs = false;
        }

        // Not used right now.
        // var types = ["SHMOS"];

        if(node.usePolling){
            node.timer = setInterval(function() {
                node.emit("input", {});
            }, node.pollInterval);

            node.status({ fill: "yellow", shape: "ring", text: "Status unknown: polling ..." });
        }
        else{
            node.status({ fill: "yellow", shape: "ring", text: "Status unknown: waiting for trigger ..." });
        }

        this.on('input', function (msg) {

            var hostname;
            if(msg.payload !== undefined){
                hostname = msg.payload.hostname;
                node.status({ fill: "green", shape: "dot", text: "Status unknown: updating ..." });
            }

            shellyTryGet('/status', node, node.pollInterval, hostname, function(body) {
                var status = body;
                var timestamp=new Date().toLocaleTimeString();
                
                if(status.sensor !== undefined && status.sensor.is_valid){
                    node.status({ fill: "green", shape: "ring", text: "Motion: " + status.sensor.motion + " Vibration: " + status.sensor.vibration + " " + timestamp});
                }
                else {
                    node.status({ fill: "red", shape: "ring", text: "Status: invalid" });
                }

                msg.status = status;
                msg.payload = {
                    sensor : status.sensor,
                    lux : status.lux,
                    bat :  status.bat,
                };
                
                if (!hasextraoutputs) {
                    node.send([msg]);   
                } 
                else {
                    let motionMsg;
                    let motionDetected = status.sensor.motion;
                    if(motionDetected)
                    {
                        motionMsg = msg;
                    }

                    let vibrationMsg;
                    let vibrationDetected = status.sensor.vibration;
                    if(vibrationDetected)
                    {
                        vibrationMsg = msg;
                    }

                    node.send([msg, motionMsg, vibrationMsg]);
                }
            },
            function(error){
                if(msg.payload){
                    node.status({ fill: "yellow", shape: "ring", text: "Status unknown: device not reachable." });
                }
            });
        });

        this.on('close', function(done) {
            clearInterval(node.timer);
            done();
        });
    }

    RED.nodes.registerType("shelly-motion", ShellyMotionNode, {
        credentials: {
            username: { type: "text" },
            password: { type: "password" },
        }
    });

    
    // --------------------------------------------------------------------------------------------
    // The EM node controls a shelly EM or EM3 device.
    /* 
    GET /status
    {
        relays: 
            []
        emeters: 
            []
    }
    */
    function ShellyEMNode(config) {
        RED.nodes.createNode(this, config);
        var node = this;
        node.hostname = config.hostname.trim();
        node.pollInterval = parseInt(config.pollinginterval);
        node.pollStatus = config.pollstatus || false;

        var types = ["SHEM"];
        start(node, types);

        this.on('input', async function (msg) {

            var hostname;
            var route = '';
            var emetersToDownload;    
            if(msg.payload !== undefined){
                hostname = msg.payload.hostname;
                var command = msg.payload;

                var relay = 0;
                if(command.relay !== undefined){
                    relay = command.relay;
                }

                var turn;
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

                if(command.download !== undefined){
                    emetersToDownload = command.download;
                }
            }

            if (route !== ''){
                shellyGet(route, node, hostname, function(body) {
                    shellyGet('/status', node, hostname, function(body) {

                        node.status({ fill: "green", shape: "ring", text: "Connected." });

                        var status = body;
                        msg.status = status;
                        msg.payload = {
                            relays : status.relays,
                            emeters : status.emeters
                        };

                        node.send([msg]);
                    });
                });
            }
            else{
                if(emetersToDownload === undefined){
                    shellyGet('/status', node, hostname, function(body) {

                        node.status({ fill: "green", shape: "ring", text: "Connected." });

                        var status = body;
                        msg.status = status;
                        msg.payload = {
                            relays : status.relays,
                            emeters : status.emeters
                        };

                        node.send([msg]);
                    });
                }
            }

            if(emetersToDownload !== undefined){

                let data = [];
                for (let i = 0; i < emetersToDownload.length; i++) {
                    let emeter = emetersToDownload[i];

                    route = "/emeter/" + emeter + "/em_data.csv";
                    
                    node.status({ fill: "green", shape: "ring", text: "Downloading CSV " + emeter});

                    try {
                        let body = await shellyGetAsync(route, node, hostname);
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
        });

        this.on('close', function(done) {
            clearInterval(node.timer);
            done();
        });
    }

    RED.nodes.registerType("shelly-emeasure", ShellyEMNode, {
        credentials: {
            username: { type: "text" },
            password: { type: "password" },
        }
    });


    // --------------------------------------------------------------------------------------------
    // The UNI node controls a shelly UNI device.
    /* 
    GET /status
    {
       
    }
    */
    function ShellyUniNode(config) {
        RED.nodes.createNode(this, config);
        var node = this;
        node.hostname = config.hostname.trim();
        node.pollInterval = parseInt(config.pollinginterval);
        node.pollStatus = config.pollstatus || false;

        var types = ["SHUNI"];
        start(node, types);
        
        this.on('input', function (msg) {

            var hostname;
            var route = '';
            if(msg.payload !== undefined){
                hostname = msg.payload.hostname;
                var command = msg.payload;

                var relay = 0;
                if(command.relay !== undefined){
                    relay = command.relay;
                }

                var turn;
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

            if (route !== ''){
                shellyGet(route, node, hostname, function(body) {
                    shellyGet('/status', node, hostname, function(body) {

                        node.status({ fill: "green", shape: "ring", text: "Connected." });

                        var status = body;
                        msg.status = status;
                        msg.payload = {
                            relays : status.relays,
                            inputs : status.inputs,
                            adcs : status.adcs
                        };

                        node.send([msg]);
                    });
                });
            }
            else{
                shellyGet('/status', node, hostname, function(body) {

                    node.status({ fill: "green", shape: "ring", text: "Connected." });

                    var status = body;
                    msg.status = status;
                    msg.payload = {
                        relays : status.relays,
                        inputs : status.inputs,
                        adcs : status.adcs
                    };
                    
                    node.send([msg]);
                });
            }
        });

        this.on('close', function(done) {
            clearInterval(node.timer);
            done();
        });
    }

    RED.nodes.registerType("shelly-uni", ShellyUniNode, {
        credentials: {
            username: { type: "text" },
            password: { type: "password" },
        }
    });

    

    // --------------------------------------------------------------------------------------------
    // The dimmer node controls a shelly TRV.
    function ShellyTrvNode(config) {
        RED.nodes.createNode(this, config);
        var node = this;
        node.hostname = config.hostname.trim();
	    node.pollInterval = parseInt(config.pollinginterval);
        node.pollStatus = config.pollstatus || false;

        /* node.shellyInfo
        GET /shelly
        {
            "type":"SHTRV-01",
            "mac":"60A423DCBA90",
            "auth":false,
            "fw":"20220202-080736/v2.1.3@d255ad74",
            "longid":1}
        */

        var types = ["SHTRV-"];
        start(node, types);

        /* when a payload is received in the format
            {
                position : 0,
                temperature : 25,
                schedule : false,
                scheduleProfile = 1,
                boostMinutes = 0
            }
        then the command is send to the shelly.

        The output gets the status of all relays.
        */
        this.on('input', function (msg) {

            var hostname;
            var route = '';
            if(msg.payload !== undefined){
                hostname = msg.payload.hostname;
                var command = msg.payload;

                var thermostat = 0;
            
                var position;
                if(command.position !== undefined){
                    if(command.position >=0 && command.position <= 100){
                        position = command.position;
                    } else { 
                        // Default is undefined
                    }
                }

                var temperature;
                if(command.temperature !== undefined){
                    if(command.temperature >=4 && command.temperature <= 31){
                        temperature = command.temperature;
                  } else { 
                      // Default is undefined
                  }
                }

                var schedule;
                if(command.schedule !== undefined){
                    if(command.schedule == true || command.schedule == false){
                        schedule = command.schedule;
                    }
                }

                var scheduleProfile;
                if(command.scheduleProfile !== undefined){
                    if(command.scheduleProfile >= 1 || command.scheduleProfile <= 5){
                        scheduleProfile = command.scheduleProfile;
                    }
                }

                var boostMinutes;
                if(command.boostMinutes !== undefined){
                    if(command.boostMinutes >= 0){
                        boostMinutes = command.boostMinutes;
                    }
                }


                if (position !== undefined){
                    route = "?pos=" + position;
                }

                if (temperature !== undefined){
                    route += "?target_t=" + temperature;
                }

                if (schedule !== undefined){
                    route += "?schedule=" + schedule;
                }

                if (scheduleProfile !== undefined){
                    route += "?schedule_profile=" + scheduleProfile;
                }

                if (boostMinutes !== undefined){
                    route += "?boost_minutes=" + boostMinutes;
                }

                if (route !== '') {
                    route = "/thermostat/" + thermostat + route;
                }
            }

            if (route !== '') {
                shellyGet(route, node, hostname, function(body) {
                    shellyGet('/status', node, hostname, function(body) {

                        node.status({ fill: "green", shape: "ring", text: "Connected." });

                        var status = body;
                        msg.status = status;
                        msg.payload = status.thermostats;
                        node.send([msg]);
                    });
		        });
            }
            else {
                shellyGet('/status', node, hostname, function(body) {

                    node.status({ fill: "green", shape: "ring", text: "Connected." });

                    var status = body;
                    msg.status = status;
                    msg.payload = status.thermostats;
                    node.send([msg]);
                });
            }
        });

        this.on('close', function(done) {
            clearInterval(node.timer);
            done();
        });
    }
    RED.nodes.registerType("shelly-trv", ShellyTrvNode, {
        credentials: {
            username: { type: "text" },
            password: { type: "password" },
        }
    });


    // --------------------------------------------------------------------------------------------
    // The button node controls a shelly button or I3 device.
    /* 
    GET /status
    {
       
    }
    */
    function ShellyButtonNode(config) {
        RED.nodes.createNode(this, config);
        var node = this;
        node.hostname = config.hostname.trim();
        node.pollInterval = parseInt(config.pollinginterval);
        node.pollStatus = config.pollstatus || false;

        var types = ["SHBTN", "SHIX3"];
        start(node, types);
        
        this.on('input', function (msg) {

            var hostname;
            var route = '';
            if(msg.payload !== undefined){
                hostname = msg.payload.hostname;
                var command = msg.payload;

                var input = 0;
                if(command.input !== undefined){
                    input = command.input;
                }

                var event = 'S';
                if(command.event !== undefined){
                    event = command.event;
                }

                var eventCount;
                if(command.eventCount !== undefined){
                    eventCount = command.eventCount;
                }
                
                route = "/input/" + input + "?event=" + event;
                if(eventCount !== undefined){
                    route += "?event_cnt=" + eventCount;       
                }
            }

            if (route !== ''){
                shellyGet(route, node, hostname, function(body) {
                    shellyGet('/status', node, hostname, function(body) {

                        node.status({ fill: "green", shape: "ring", text: "Connected." });

                        var status = body;
                        msg.status = status;
                        msg.payload = {
                            relays : status.relays,
                            inputs : status.inputs,
                            adcs : status.adcs
                        };

                        node.send([msg]);
                    });
                });
            }
            else{
                shellyGet('/status', node, hostname, function(body) {

                    node.status({ fill: "green", shape: "ring", text: "Connected." });

                    var status = body;
                    msg.status = status;
                    msg.payload = {
                        inputs : status.inputs
                    };
                    
                    node.send([msg]);
                });
            }
        });

        this.on('close', function(done) {
            clearInterval(node.timer);
            done();
        });
    }

    RED.nodes.registerType("shelly-button", ShellyButtonNode, {
        credentials: {
            username: { type: "text" },
            password: { type: "password" },
        }
    });



    // GEN 2 --------------------------------------------------------------------------------------
    
    // --------------------------------------------------------------------------------------------
    // The switch node controls a shelly switch gen 2: Shelly 1 plus Shelly 1 PM plus
    function ShellySwitch2Node(config) {
        RED.nodes.createNode(this, config);
        var node = this;
        node.hostname = config.hostname.trim();
        node.pollInterval = parseInt(config.pollinginterval);
        node.pollStatus = config.pollstatus || false;

        /* node.shellyInfo
        GET /shelly
        { 
            "id":"shellyplus1pm-44179394b8d0",
            "mac":"44179394B8D0",
            "model":"SNSW-001P16EU",
            "gen":2, 
            "fw_id":"20210921-202918/0.8.1-g52de872",
            "ver":"0.8.1",
            "app":"Plus1PM",
            "auth_en":false,
            "auth_domain":null }
        */

        var types = ["SNSW-"];
        start(node, types);


        /* when a payload is received in the format
            {
                id : 0,
                on : true,
                toggle_after : 1
            }
        then the command is send to the shelly.

        The output gets the status of the relay with id.
        */
        this.on('input', function (msg) {

            var hostname;
            var route = '';
            if(msg.payload !== undefined){
                hostname = msg.payload.hostname;
                var command = msg.payload;

                var id;
                if(command.id !== undefined){
                    id = command.id;
                }

                var method;
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

            var getStatusRoute = '/rpc/Shelly.GetStatus';
            if (route !== ''){
                shellyGet(route, node, hostname, function(body) {
                    shellyGet(getStatusRoute, node, hostname, function(body) {

                        node.status({ fill: "green", shape: "ring", text: "Connected." });

                        var status = body;
                        msg.payload = status;
                        node.send([msg]);
                    });
                });
            }
            else {
                shellyGet(getStatusRoute, node, hostname, function(body) {

                    node.status({ fill: "green", shape: "ring", text: "Connected." });
                        
                    var status = body;
                    msg.payload = status;
                    node.send([msg]);
                });
            }
        });

        this.on('close', function(done) {
            clearInterval(node.timer);
            done();
        });
    }
    RED.nodes.registerType("shelly-switch2", ShellySwitch2Node, {
        credentials: {
            username: { type: "text" },
            password: { type: "password" },
        }
    });
}