// Created by Karl-Heinz Wind
// see also https://shelly-api-docs.shelly.cloud/#common-http-api

module.exports = function (RED) {
    'use strict';

    const utils = require('./lib/utils.js');
    const shelly = require('./lib/shelly.js');
    const configuration = require('./lib/configuration.js');

    const pkg = require('./../package.json');
    RED.log.info('node-red-contrib-shelly version: v' + pkg.version);

    // ------------------------------------------------------------------------------------
    // Web server routes for the web configuration.
    RED.httpAdmin.get('/node-red-contrib-shelly-getidevicetypesgen1', function (req, res) {
        let deviceTypeInfos = configuration.getDeviceTypeInfos('1');
        res.json(deviceTypeInfos);
    });

    RED.httpAdmin.get('/node-red-contrib-shelly-getidevicetypesgen2', function (req, res) {
        let deviceTypeInfos2 = configuration.getDeviceTypeInfos('2');
        let deviceTypeInfos3 = configuration.getDeviceTypeInfos('3');
        let deviceTypeInfos4 = configuration.getDeviceTypeInfos('4');
        let deviceTypeInfos = deviceTypeInfos2;
        deviceTypeInfos = deviceTypeInfos.concat(deviceTypeInfos3);
        deviceTypeInfos = deviceTypeInfos.concat(deviceTypeInfos4);
        res.json(deviceTypeInfos);
    });

    RED.httpAdmin.get('/node-red-contrib-shelly-getipaddresses', function (req, res) {
        let ipAddresses = shelly.getIPAddresses();
        res.json(ipAddresses);
    });

    RED.httpAdmin.get('/node-red-contrib-shelly-getshellyinfo', async function (req, res) {
        let shellyInfo;
        try {
            let hostname = utils.trim(req.query.hostname);
            shellyInfo = await shelly.getShellyInfo(hostname);

            // Generation 1 devices are mapped to gen2+ schema
            if (shellyInfo.type) {
                shellyInfo.gen = 1;
                shellyInfo.model = shellyInfo.type;
            }

            let device = configuration.getDevice(shellyInfo.model);
            if (device) {
                shellyInfo.device = device;
            }
        } catch (error) {
            shellyInfo = {};
        }

        res.json(shellyInfo);
    });

    // ------------------------------------------------------------------------------------
    // Node registrations
    // GEN1
    const ShellyGen1ServerNode = require('./nodes/gen1-server-node.js')(RED);
    RED.nodes.registerType('shelly-gen1-server', ShellyGen1ServerNode, {
        credentials: {
            token: { type: 'text' },
        },
    });

    const ShellyGen1Node = require('./nodes/gen1-node.js')(RED);
    RED.nodes.registerType('shelly-gen1', ShellyGen1Node, {
        credentials: {
            username: { type: 'text' },
            password: { type: 'password' },
        },
    });

    // GEN2+
    const ShellyGen2Node = require('./nodes/gen2-node.js')(RED);
    RED.nodes.registerType('shelly-gen2', ShellyGen2Node, {
        credentials: {
            username: { type: 'text' },
            password: { type: 'password' },
        },
    });

    const ShellyGen2ServerNode = require('./nodes/gen2-server-node.js')(RED);
    RED.nodes.registerType('shelly-gen2-server', ShellyGen2ServerNode, {
        credentials: {
            token: { type: 'text' },
        },
    });

    // Cloud
    const ShellyCloudServerNode = require('./nodes/cloud-server-node.js')(RED);
    RED.nodes.registerType('shelly-cloud-server', ShellyCloudServerNode, {
        credentials: {
            serveruri: { type: 'text' },
            authkey: { type: 'password' },
        },
    });

    const ShellyCloudNode = require('./nodes/cloud-node.js')(RED);
    RED.nodes.registerType('shelly-cloud', ShellyCloudNode, {});
};
