/**
* Created by Karl-Heinz Wind
* see also https://shelly-api-docs.shelly.cloud/#common-http-api 

TODO:
Support for Control roller shutter
GET /settings/roller/0
**/

module.exports = function (RED) {
    "use strict";
    var request = require('request');

    // --------------------------------------------------------------------------------------------
    // The switch node controls a shelly switch.
    function ShellySwitchNode(config) {
        RED.nodes.createNode(this, config);
        var node = this;
        node.hostname = config.hostname;

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
       shellyGet('/shelly', node, function(result) {
            node.shellyInfo = JSON.parse(result);
            if(node.shellyInfo.type.startsWith("SHPLG-") || node.shellyInfo.type.startsWith("SHSW-")){
                node.status({ fill: "green", shape: "ring", text: "Shelly requires auth: " + node.shellyInfo.auth });    
            }
            else{
                node.status({ fill: "red", shape: "ring", text: "Shelly type " + node.shellyInfo.type + " is not known." });
            }  
        });

        /* when a payload is received in the format 
            {
                relay : 0, 
                on : true
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

                var onOff;
                if(command.on !== undefined){
                    if(command.on == true){
                        onOff = "on";        
                    }
                    else{
                        onOff = "off"
                    }
                }

                if(onOff != undefined){
                    route = "/relay/" + relay + "?turn=" + onOff;
                }
            }

            if(route){
                shellyGet(route, node, function(result) {
                    shellyGet('/status', node, function(result) {
                        var status = JSON.parse(result);
                        var msg = { payload: status.relays };
                        node.send([msg]);
                    });
                });
            }
            else{
                shellyGet('/status', node, function(result) {
                    var status = JSON.parse(result);
                    var msg = { payload: status.relays };
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
}
