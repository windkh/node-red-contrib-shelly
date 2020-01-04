/**
* Created by Karl-Heinz Wind
* see also https://shelly-api-docs.shelly.cloud/#common-http-api 

TODO:
Support for Control roller shutter
GET /settings/roller/0

Support for Door Switch
status {"wifi_sta":{"connected":true,"ssid":"HiveRelayR2","ip":"192.168.178.146","rssi":-75},"cloud":{"enabled":true,"connected":true},"mqtt":{"connected":false},"time":"15:05","serial":3,"has_update":false,"mac":"98F4ABB88DB4","is_valid":true,"lux":{"value":51, "illumination": "dark", "is_valid":true},"sensor":{"state":"open", "is_valid":true},"bat":{"value":100,"voltage":6.00},"act_reasons":["poweron"],"update":{"status":"idle","has_update":false,"new_version":"20191216-090511/v1.5.7@c30657ba","old_version":"20191216-090511/v1.5.7@c30657ba"},"ram_total":50592,"ram_free":40304,"fs_size":233681,"fs_free":162648,"uptime":18}
settings {"device":{"type":"SHDW-1","mac":"98F4ABB88DB4","hostname":"shellydw-B88DB4","sleep_mode":true},"wifi_ap":{"enabled":false,"ssid":"shellydw-B88DB4","key":""},"wifi_sta":{"enabled":true,"ssid":"HiveRelayR2","ipv4_method":"dhcp","ip":null,"gw":null,"mask":null,"dns":null},"wifi_sta1":{"enabled":false,"ssid":null,"ipv4_method":"dhcp","ip":null,"gw":null,"mask":null,"dns":null},"mqtt": {"enable":false,"server":"192.168.33.3:1883","user":"","id":"shellydw-B88DB4","reconnect_timeout_max":60.000000,"reconnect_timeout_min":2.000000,"clean_session":true,"keep_alive":60,"max_qos":0,"retain":false,"update_period":30},"sntp": {"server":"time.google.com"},"login":{"enabled":false,"unprotected":false,"username":"admin","password":"admin"},"pin_code":"v}Djh$","name":"","fw":"20191216-090511/v1.5.7@c30657ba","build_info":{"build_id":"20191216-090511/v1.5.7@c30657ba","build_timestamp":"2019-12-16T09:05:11Z","build_version":"1.0"},"cloud":{"enabled":true,"connected":true},"timezone":"Europe/Berlin","lat":49.864700,"lng":8.625460,"tzautodetect":true,"time":"15:05","dark_threshold":100,"twilight_threshold":300,"sleep_mode":{"period":6,"unit":"h"},"led_status_disable":true,"report_url":"", "dark_url":"", "twilight_url":""} 
lux
battery
closed open
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

    function shellyTryGet(route, node, callback){
            
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
                // node.status({ fill: "red", shape: "ring", text: "Request failed " + error });
            }
        });
    }

    // --------------------------------------------------------------------------------------------
    // The switch node controls a shelly switch.
    function ShellySwitchNode(config) {
        RED.nodes.createNode(this, config);
        var node = this;
        node.hostname = config.hostname;

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
                node.status({ fill: "green", shape: "ring", text: "Connected." });    
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


    // --------------------------------------------------------------------------------------------
    // The door node controls a shelly door device.
    function ShellyDoorNode(config) {
        RED.nodes.createNode(this, config);
        var node = this;
        node.hostname = config.hostname;
        node.interval = 1000;
        node.polling = true;
        this.timer = null;
        
        /* The device can diconnect but wakes up when the switch changes the state.
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
        
        // TODO: implement webhook as alternative
        var text;
        if(node.polling){
            this.timer = setInterval(function() {
                    node.emit("input", {});
                }, node.interval);
                text = "Status unknown: polling ...";
        }
        else{
            text = "Status unknown: waiting ...";
            // TODO: start server for webhook
        }
        node.status({ fill: "orange", shape: "ring", text: text });   
       
        this.on('input', function (msg) {

            shellyTryGet('/status', node, function(result) {
                var status = JSON.parse(result);
                var timestamp=new Date().toLocaleTimeString();
                if(status.sensor.is_valid){
                    node.status({ fill: "green", shape: "ring", text: "Status: " + status.sensor.state + " " + timestamp});   
                }
                else {
                    node.status({ fill: "red", shape: "ring", text: "Status: invalid" });   
                }

                var payload = {
                    sensor : status.sensor,
                    lux : status.lux,
                    bat :  status.bat, 
                }

                var msg = { payload: payload };
                node.send([msg]);
            });
        
        });

        this.on('close', function(msg) {
            clearInterval(this.timer);   
            this.timer = null; 
        }); 
    }

    RED.nodes.registerType("shelly-door", ShellyDoorNode, {
        credentials: {
            username: { type: "text" },
            password: { type: "password" },
        }
    });
}
