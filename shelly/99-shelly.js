/**
* Created by Karl-Heinz Wind
* see also https://shelly-api-docs.shelly.cloud/#common-http-api
**/

module.exports = function (RED) {
    "use strict";
    var request = require('request');

    // generic REST get wrapper
    function shellyGet(route, node, callback){

        var options = {
            url: 'http://' + node.hostname + route
        };
        if(node.credentials.username !== undefined && node.credentials.password !== undefined) {
            options.auth = {
                username: node.credentials.username,
                password: node.credentials.password
            };
        };

        request.get(options, function (error, response, body) {
            if(!error){
                if(response.statusMessage == "OK"){
                callback(body);
                } else {
                    node.status({ fill: "red", shape: "ring", text: "Error: " + response.statusMessage });
                }
            } else {
                node.status({ fill: "red", shape: "ring", text: "Request failed " + error });
            }
        });
    }

    // Note that this function has a reduced timeout.
    function shellyTryGet(route, node, timeout, callback, errorCallback){

        var options = {
            url: 'http://' + node.hostname + route,
            timeout: timeout
        };
        if(node.credentials.username !== undefined && node.credentials.password !== undefined) {
            options.auth = {
                username: node.credentials.username,
                password: node.credentials.password
            };
        };

        request.get(options, function (error, response, body) {
            if(!error){
                if(response.statusMessage == "OK"){
                callback(body);
                } else {
                    node.status({ fill: "red", shape: "ring", text: "Error: " + response.statusMessage });
                }
            } else {
                errorCallback(error);
            }
        });
    }

    function shellyPing(node, types){
        shellyGet('/shelly', node, function(result) {
            node.shellyInfo = JSON.parse(result);

            var found = false;
            for (var i = 0; i < types.length; i++) {
                var type = types[i];
                found  = node.shellyInfo.type.startsWith(type)
                if (found) {
                    break;
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

    // --------------------------------------------------------------------------------------------
    // The switch node controls a shelly switch.
    function ShellySwitchNode(config) {
        RED.nodes.createNode(this, config);
        var node = this;
        node.hostname = config.hostname;
        node.pollInterval = parseInt(config.pollinginterval);

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
        shellyPing(node, types);

        if(node.pollInterval > 0) {
            node.timer = setInterval(function() {
                shellyPing(node, types);
            }, node.pollInterval);
        }

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

            var route;
            if(msg.payload !== undefined){
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

                if(turn != undefined){
                    route = "/relay/" + relay + "?turn=" + turn;
                }
            }

            if(route){
                shellyGet(route, node, function(result) {
                    shellyGet('/status', node, function(result) {
                        var status = JSON.parse(result);
                        msg.status = status;
                        msg.payload = status.relays;
                        node.send([msg]);
                    });
                });
            }
            else{
                shellyGet('/status', node, function(result) {
                    var status = JSON.parse(result);
                    msg.status = status;
                    msg.payload = status.relays;
                    node.send([msg]);
                });
            }
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
    /* The device can diconnect but wakes up when the switch changes the state or after every 4-5 minutes
    GET /status
    {
        "wifi_sta":{"connected":true,"ssid":"HiveRelayR2","ip":"192.168.178.146","rssi":-62},
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
        node.hostname = config.hostname;
        node.sendRawStatus = config.sendfullstatus;
        node.usePolling = config.usepolling;
        node.pollInterval = parseInt(config.pollinginterval);

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

                if(msg.payload){
                    node.status({ fill: "green", shape: "dot", text: "Status unknown: updating ..." });
                }

                shellyTryGet('/status', node, node.pollInterval, function(result) {
                    var status = JSON.parse(result);
                    var timestamp=new Date().toLocaleTimeString();
                    if(status.sensor.is_valid){
                        node.status({ fill: "green", shape: "ring", text: "Status: " + status.sensor.state + " " + timestamp});
                    }
                    else {
                        node.status({ fill: "red", shape: "ring", text: "Status: invalid" });
                    }

                    var payload;
                    if(!node.sendRawStatus){
                        payload = {
                            sensor : status.sensor,
                            lux : status.lux,
                            bat :  status.bat,
                        }
                    }
                    else{
                        payload = status;
                    }

                    msg.payload = payload;
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
        node.hostname = config.hostname;
        node.pollInterval = parseInt(config.pollinginterval);

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
        shellyPing(node, types);

        if(node.pollInterval > 0) {
            node.timer = setInterval(function() {
                shellyPing(node, types);
            }, node.pollInterval);
        }

        /* when a payload is received in the format
            {
                roller : 0,
                on : true
            }
        then the command is send to the shelly.

        The output gets the status of all rollers.
        */
        this.on('input', function (msg) {

            var route;
            if(msg.payload !== undefined){
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

                if(go != undefined){
                    route = "/roller/" + roller + "?go=" + go;
                }
            }

            if(route){
                shellyGet(route, node, function(result) {
                    shellyGet('/status', node, function(result) {
                        var status = JSON.parse(result);
                        msg.status = status;
                        msg.payload = status.rollers;
                        node.send([msg]);
                    });
                });
            }
            else{
                shellyGet('/status', node, function(result) {
                    var status = JSON.parse(result);
                    msg.status = status;
                    msg.payload = status.rollers;
                    node.send([msg]);
                });
            }
        });

    }
    RED.nodes.registerType("shelly-roller-shutter", ShellyRollerShutterNode, {
        credentials: {
            username: { type: "text" },
            password: { type: "password" },
        }
    });


    // --------------------------------------------------------------------------------------------
    // The dimmer node controls a shelly dimmer.
    function ShellyDimmerNode(config) {
        RED.nodes.createNode(this, config);
        var node = this;
        node.hostname = config.hostname;
	    node.dimmerStat = config.dimmerStat || false;
        node.pollInterval = parseInt(config.pollinginterval);

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

        var types = ["SHDM-"];
        shellyPing(node, types);

        if(node.pollInterval > 0) {
            node.timer = setInterval(function() {
                shellyPing(node, types);
            }, node.pollInterval);
        }

        /* when a payload is received in the format
            {
                light : 0,
                on : true,
                brightness : 75
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

            var route;
            if(msg.payload !== undefined){
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

                if (turn != undefined && brightness != undefined){
                  route = "/light/" + light + "?turn=" + turn + "&brightness=" + brightness;
                }
                else if (brightness != undefined){
                    route = "/light/" + light + "?brightness=" + brightness;
                }
                else if (turn != undefined){
                    route = "/light/" + light + "?turn=" + turn;
                }
            }

            if(route) {
                shellyGet(route, node, function(result) {
		            if (node.dimmerStat) {
			            shellyGet('/status', node, function(result) {
                            var status = JSON.parse(result);
                            msg.status = status;
                            msg.payload = status.lights;
                            node.send([msg]);
			            });
		            }
                });
            }
            else {
                shellyGet('/status', node, function(result) {
                    var status = JSON.parse(result);
                    msg.status = status;
                    msg.payload = status.lights;
                    node.send([msg]);
                });
            }
        });

    }
    RED.nodes.registerType("shelly-dimmer", ShellyDimmerNode, {
        credentials: {
            username: { type: "text" },
            password: { type: "password" },
        }
    });


    // --------------------------------------------------------------------------------------------
    // The RGBW2 node controls a shelly LED stripe.
    function ShellyRGBW2Node(config) {
        RED.nodes.createNode(this, config);
        var node = this;
        node.hostname = config.hostname;

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

        shellyPing(node, ["SHRGBW2"]);

        /* when a payload is received in the format
            {
                red : 0,
                green : 0,
                blue : 0,
                on : true,
                white : 75,
                gain: 100,
                effect: 1
            }

        then the command is send to the shelly.
        */

        this.on('input', function (msg) {

            var route;
            if(msg.payload !== undefined) {
                var command = msg.payload;

                var red;
                if(command.red !== undefined) {
                    if(command.red >=1 && command.red <= 255) {
                        red = command.red;
                    } else {
                        red = 255;  // Default to full brightness
                    }
                }

                var green;
                if (command.green !== undefined) {
                    if (command.green >=1 && command.green <= 255) {
                        green = command.green;
                    } else {
                        green = 255;  // Default to full brightness
                    }
                }

                var blue;
                if(command.blue !== undefined){
                    if (command.blue >=1 && command.blue <= 255){
                        blue = command.blue;
                    } else {
                        blue = 255;  // Default to full brightness
                    }
                }

                var white;
                if(command.white !== undefined) {
                    if (command.white >=1 && command.white <= 255) {
                        white = command.white;
                    } else {
                        white = 255;  // Default to full brightness
                    }
                }

                var gain;
                if (command.gain !== undefined) {
                    if (command.gain >=1 && command.gain <= 100) {
                        gain = command.gain;
                    } else {
                        gain = 100;  // Default to full gain
                    }
                }

                var effect;
                if (command.effect !== undefined) {
                    if (command.effect >=0 && command.effect <= 6) {
                        effect = command.effect;
                    } else {
                        effect = 0  // Default to no effect
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


                if  (turn != undefined && 
                    effect != undefined && 
                    red != undefined && 
                    green != undefined && 
                    blue != undefined && 
                    white != undefined && 
                    efffect != effect) {
                    route = "/color/0?turn=" + turn
                        + "&gain=" + effect
                        + "&red=" + red
                        + "&green=" + green
                        + "&blue=" + blue
                        + "&white=" + white
                        + "&effect=" + effect;
                }
                else if (turn != undefined) {
                    route = "/color/0?turn=" + turn;
                }
            }

            if (route){
                shellyGet(route, node, function(result) {
                    shellyGet('/status', node, function(result) {
                        var status = JSON.parse(result);
                        msg.status = status;
                        msg.payload = status.lights;
                        node.send([msg]);
                    });
                });
            }
            else {
                shellyGet('/status', node, function(result) {
                    var status = JSON.parse(result);
                    msg.status = status;
                    msg.payload = status.lights;
                    node.send([msg]);
                });
            }
        });
    }
    RED.nodes.registerType("shelly-rgbw2", ShellyRGBW2Node, {
        credentials: {
            username: { type: "text" },
            password: { type: "password" },
        }
    });
}
