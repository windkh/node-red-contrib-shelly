# Shelly nodes for node-red
[![Platform](https://img.shields.io/badge/platform-Node--RED-red)](https://nodered.org)
![License](https://img.shields.io/github/license/windkh/node-red-contrib-shelly.svg)
[![NPM](https://img.shields.io/npm/v/node-red-contrib-shelly?logo=npm)](https://www.npmjs.org/package/node-red-contrib-shelly)
[![Known Vulnerabilities](https://snyk.io/test/npm/node-red-contrib-shelly/badge.svg)](https://snyk.io/test/npm/node-red-contrib-shelly)
[![Downloads](https://img.shields.io/npm/dm/node-red-contrib-shelly.svg)](https://www.npmjs.com/package/node-red-contrib-shelly)
[![Total Downloads](https://img.shields.io/npm/dt/node-red-contrib-shelly.svg)](https://www.npmjs.com/package/node-red-contrib-shelly)
[![Package Quality](http://npm.packagequality.com/shield/node-red-contrib-shelly.png)](http://packagequality.com/#?package=node-red-contrib-shelly)
![Build](https://img.shields.io/github/actions/workflow/status/windkh/node-red-contrib-shelly/node.js.yml)
[![Open Issues](https://img.shields.io/github/issues-raw/windkh/node-red-contrib-shelly.svg)](https://github.com/windkh/node-red-contrib-shelly/issues)
[![Closed Issues](https://img.shields.io/github/issues-closed-raw/windkh/node-red-contrib-shelly.svg)](https://github.com/windkh/node-red-contrib-shelly/issues?q=is%3Aissue+is%3Aclosed)
...

This package contains nodes for controlling shelly devices via the following API:
https://shelly-api-docs.shelly.cloud/


# Dependencies
This package depends on the following libraries
- axios see https://github.com/axios/axios
- axios-rate-limit https://github.com/aishek/axios-rate-limit
- fastify see https://github.com/fastify/fastify
- ip see https://github.com/indutny/node-ip
- path see https://github.com/jinder/path
- crypto see https://github.com/brix/crypto-js


# Supported Devices

The following table lists all Shelly devices that are supported by this package. Devices marked as "true" have been tested and confirmed to work. Devices marked as "not tested" should work but have not been verified yet.

## Generation 1 Devices

| Device Name | Model | Type |
|-------------|-------|------|
| Shelly 1 | SHSW-1 | Relay |
| Shelly 1PM | SHSW-PM | Relay |
| Shelly 1L Relay | SHSW-L | Relay |
| Shelly 1L Roller | SHSW-L | Roller |
| Shelly 2 Relay | SHSW-21 | Relay |
| Shelly 2 Roller | SHSW-21 | Relay |
| Shelly 2.5 Relay | SHSW-25 | Relay |
| Shelly 2.5 Roller | SHSW-25 | Roller |
| Shelly I3 | SHIX3-1 | Button |
| Shelly EM | SHEM | Measure |
| Shelly 3EM | SHEM-3 | Measure |
| Shelly UNI | SHUNI-1 | Relay |
| Shelly TRV | SHTRV-01 | Thermostat |
| Shelly Button 1 | SHBTN-1 | Button |
| Shelly Button 2 | SHBTN-2 | Button |
| Shelly Plug | SHPLG-1 | Relay |
| Shelly Plug E | SHPLG2-1 | Relay |
| Shelly Plug S | SHPLG-S | Relay |
| Shelly Plug US | SHPLG-U1 | Relay |
| Shelly RGBW2 | SHRGBW2 | RGBW |
| Shelly Dimmer 1 | SHDM-1 | Dimmer |
| Shelly Dimmer 2 | SHDM-2 | Dimmer |
| Shelly DUO | SHBDUO-1 | Dimmer |
| Shelly Vintage | SHVIN-1 | Dimmer |
| Shelly Duo RGBW | SHCB-1 | RGBW |
| Shelly Bulb RGBW | SHBLB-1 | RGBW |
| Shelly H&T | SHHT-1 | Sensor |
| Shelly Flood | SHWT-1 | Sensor |
| Shelly Door/Window 1 | SHDW-1 | Sensor |
| Shelly Door/Window 2 | SHDW-2 | Sensor |
| Shelly Gas | SHGS-1 | Sensor |
| Shelly Motion | SHMOS-01 | Sensor |
| Shelly Motion 2 | SHMOS-02 | Sensor |
| Shelly Smoke | SHSM-01 | Sensor |

## Generation 2 Devices

| Device Name | Model | Type |
|-------------|-------|------|
| Shelly Plus 1 | SNSW-001X16EU | Relay |
| Shelly Plus 1 UL | SNSW-001X15UL | Relay |
| Shelly Plus 1PM | SNSW-001P16EU | Relay |
| Shelly Plus 1PM UL | SNSW-001P15UL | Relay |
| Shelly Plus 2PM | SNSW-002P16EU | Relay |
| Shelly Plus 2PM v.1 | SNSW-102P16EU | Relay |
| Shelly Plus 2PM UL | SNSW-002P15UL | Relay |
| Shelly Plus i4 | SNSN-0024X | Button |
| Shelly Plus i4DC | SNSN-0D24X | Button |
| Shelly Plus H&T | SNSN-0013A | Sensor |
| Shelly Plus Plug IT | SNPL-00110IT | Relay |
| Shelly Plus Plug S | SNPL-00112EU | Relay |
| Shelly Plus Plug S V2 | SNPL-10112EU | Relay |
| Shelly Plus Plug UK | SNPL-00112UK | Relay |
| Shelly Plus Plug US | SNPL-00116US | Relay |
| Shelly Plus Smoke | SNSN-0031Z | Sensor |
| Shelly Plus Wall Dimmer | SNDM-0013US | Dimmer |
| Shelly Plus Uni | SNSN-0043X | Relay |
| Shelly Plus 0-10V Dimmer | SNDM-00100WW | Dimmer |
| Shelly Plus RGBW PM | SNDC-0D4P10WW | RGBW |
| Shelly Plus 1 Mini | SNSW-001X8EU | Relay |
| Shelly Plus 1PM Mini | SNSW-001P8EU | Relay |
| Shelly Plus PM Mini | SNPM-001PCEU16 | Relay |
| Shelly Pro 1 | SPSW-001XE16EU | Relay |
| Shelly Pro 1 v.0 | SPSW-101XE16EU | Relay |
| Shelly Pro 1 v.1 | SPSW-201XE16EU | Relay |
| Shelly Pro 1 v.1 UL | SPSW-201XE15UL | Relay |
| Shelly Pro 1PM | SPSW-001PE16EU | Relay |
| Shelly Pro 1PM v.0 | SPSW-101PE16EU | Relay |
| Shelly Pro 1PM v.1 | SPSW-201PE16EU | Relay |
| Shelly Pro 1PM v.1 UL | SPSW-201PE15UL | Relay |
| Shelly Pro 2 v.1 | SPSW-202XE16EU | Relay |
| Shelly Pro 2 v.1 UL | SPSW-202XE12UL | Relay |
| Shelly Pro 2PM | SPSW-002PE16EU | Relay |
| Shelly Pro 2PM v.0 | SPSW-102PE16EU | Relay |
| Shelly Pro 2PM v.1 | SPSW-202PE16EU | Relay |
| Shelly Pro Dual Cover/Shutter PM | SPSH-002PE16EU | Relay |
| Shelly Pro Dimmer 1PM | SPDM-001PE01EU | Dimmer |
| Shelly Pro Dimmer 2PM | SPDM-002PE01EU | Dimmer |
| Shelly Pro Dimmer 0/1-10V PM | SPCC-001PE10EU | Dimmer |
| Shelly Pro 3 | SPSW-003XE16EU | Relay |
| Shelly Pro 3EM | SPEM-003CEBEU | Measure |
| Shelly Pro 3EM | SPEM-003CEBEU120 | Measure |
| Shelly Pro 3EM-400 | SPEM-003CEBEU400 | Measure |
| Shelly Pro EM-50 | SPEM-002CEBEU50 | Measure |
| Shelly Pro 4PM V1 | SPSW-004PE16EU | Relay |
| Shelly Pro 4PM V2 | SPSW-104PE16EU | Relay |
| Shelly Pro 4PM V3 | SPSW-204PE16EU | Relay |
| Shelly Pro RGBWW PM | SPDC-0D5PE16EU | RGBW |
| Shelly Wall Display | SAWD-0A1XX10EU1 | Relay |
| Shelly Wall Display X2 | SAWD-2A1XX10EU1 | Relay |
| ShellyBLU Gateway | SNGW-BT01 | BluGateway |

## Generation 3 Devices

| Device Name | Model | Type |
|-------------|-------|------|
| Shelly 1 Gen3 | S3SW-001X16EU | Relay |
| Shelly 1PM Gen3 | S3SW-001P16EU | Relay |
| Shelly 2PM Gen3 | S3SW-002P16EU | Relay |
| Shelly i4 Gen3 | S3SN-0024X | Button |
| Shelly H&T Gen3 | S3SN-0U12A | Sensor |
| Shelly Dimmer Gen3 | S3DM-0A101WWL | Dimmer |
| Shelly Dimmer 0/1-10V PM Gen3 | S3DM-0010WW | Dimmer |
| Shelly Plug S MTR Gen3 | S3PL-00112EU | Relay |
| Shelly 1 Mini Gen3 | S3SW-001X8EU | Relay |
| Shelly 1PM Mini Gen3 | S3SW-001P8EU | Relay |
| Shelly PM Mini Gen3 | S3PM-001PCEU16 | Relay |
| Shelly DALI Dimmer Gen3 | S3DM-0A1WW | Dimmer |
| Shelly EM Gen3 | S3EM-002CXCEU | Measure |
| Shelly 3EM-63 Gen3 | S3EM-003CXCEU63 | Measure |
| ShellyBLU Gateway Gen3 | S3GW-1DBT001 | BluGateway |
| Shelly Outdoor Plug S Gen3 | S3PL-20112EU | Relay |
| Shelly AZ Plug Gen3 | S3PL-10112EU | Relay |
| Shelly Shutter Gen3 | S3SH-0A2P4EU | Roller |
| Shelly 2L Gen3 | S3SW-0A2X4EUL | Relay |
| Shelly 1L Gen3 | S3SW-0A1X1EUL | Relay |
| Shelly The Pill Gen3 | S3SN-0U53X | Sensor |
| Shelly Plug PM Gen3 | S3PL-30116EU | Relay |
| Shelly Plug M Gen3 | S3PL-30110EU | Relay |
| Shelly Ogemray Smart Relay 25A | S3PB-O3AR000001 | Relay |

## Generation 4 Devices

| Device Name | Model | Type |
|-------------|-------|------|
| Shelly 1 Gen4 | S4SW-001X16EU | Relay |
| Shelly 1PM Gen4 | S4SW-001P16EU | Relay |
| Shelly 2PM Gen4 | S4SW-002P16EU | Relay |
| Shelly 1 Mini Gen4 | S4SW-001X8EU | Relay |
| Shelly 1PM Mini Gen4 | S4SW-001P8EU | Relay |
| Shelly EM Mini Gen4 | S4EM-001PXCEU16 | Measure |
| Shelly Flood Gen4 | S4SN-0071A | Sensor |
| Shelly Power Strip 4 Gen4 | S4PL-00416EU | Relay |
| Shelly Plug US Gen4 | S4PL-00116US | Relay |
| Shelly Dimmer Gen4 | S4DM-0A101WWL | Dimmer |
| Shelly 1 Gen4 ANZ | S4SW-001X16ANZ | Relay |
| Shelly 1PM Gen4 ANZ | S4SW-001P16ANZ | Relay |
| Shelly 2PM Gen4 ANZ | S4SW-002P16ANZ | Relay |

## BLU Devices
Blu devices must be connected to a BlueGateway or any other bluetooth capable shelly.

**Note:** Devices marked as "not tested" should work but have not been verified. If you discover a new device or encounter issues, please create an issue on GitHub with the information returned from the /shelly endpoint of the device.


# Thanks for your donation
If you want to support this free project. Any help is welcome. You can donate by clicking one of the following links:

<a target="blank" href="https://blockchain.com/btc/payment_request?address=1PBi7BoZ1mBLQx4ePbwh1MVoK2RaoiDsp5"><img src="https://img.shields.io/badge/Donate-Bitcoin-green.svg"/></a>
<a target="blank" href="https://www.paypal.me/windkh"><img src="https://img.shields.io/badge/Donate-PayPal-blue.svg"/></a>

<a href="https://www.buymeacoffee.com/windka" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/default-orange.png" alt="Buy Me A Coffee" height="41" width="174"></a>


# Credits
- gerdemann for providing the roller shutter code
- Gophlin for provider the Dimmer (SL) code
- minuq for providing pull request for issue #7
- Paul-Reed for enhancing the dimmer node see issue #21
- Docjones for providing the skeleton for ShellyRGBW node see pull request #15
- arvidcarlander  for adding all_status feature to cloud node
- teixemf for testing and fixing gen 2 rpc problems 
- MichaelEFlip for improving the readme
- Solarer for fixing script overload
- prpr19xx for adding exception handling to callback script

# 👥 Contributors

  <p align="center">
    <a href="https://github.com/windkh/node-red-contrib-shelly/graphs/contributors">
      <img src="https://contrib.rocks/image?repo=windkh/node-red-contrib-shelly" />
    </a>
  </p>


# Changelog
Changes can be followed [here](/CHANGELOG.md)


# General
To check if the node is available in the network, a HTTP GET to /shelly is issued. This route returns a type string which is 
verified. You can configure an interval for the polling. The default is 5000ms, 0 is off = no polling. 
Most nodes will call HTTP GET to the /status route after a input is received from the node.
This answer is directly available at the output via msg.status. The msg.payload property 
contains a lightweight version of this status object.
The hostname can be left empty in the configuration node. This deactivates polling, too. In this case you must pass the hostname in
the msg.payload.hostname. This can be useful, if you want to use one node for several devices or if you want to make use of sub flows.
(username and password can be passed in msg.payload, too)


```
{
    hostname : '192.168.178.250'
    username : 'user'
    password : 'password'
	...
}
```

## callback mode vs polling mode
Unlike generation 2 devices which support scripts the older generation 1 supports only webhooks which are very limited. You can always use polling mode, but some devices like sensors and buttons
often sleep to safe energy. In this state the node can not reach the shelly in the local network. This results in a polling error which is not a problem, but often generates
confusion when the user sees error messages in the node-red debugger or console. To avoid this you can try to enable callback mode.
In callback mode a webhook is configured to the shelly which notifies to the node when sensor data changed. The node needs to open a network port to be able to receive these messages.
You must configure this network port, make sure that it is not already in use. If node-red runs inside a docker container or any other bridged network then you should also configure the hostname
under that the shelly device can reach the node-red server (Leave this field empty if you run inside the same network segment).
The node retries to set the webhook if the device is sleeping as long as it succeeds. As soon as the status shows "Connected" the webhook is set.
Note that gen2+ devices that have bluetooth support can act as a bluetooth gateway for shelly BLU devices. To activate that feature you must use callback node and check the bluetooth checkbox.


# Shelly Node (Generation 1)
See also https://shelly-api-docs.shelly.cloud/gen1/#shelly-family-overview
The node can communicate with several shelly types. You must select the correct device type from the combobox when configuring the node.
Devices are grouped as follows:


## Settings
You can configure your shelly from within the web interface. But there is also the possibility to change the settings from with a flow.
Simply pass one or more settings objects in msg.settings:


```
[
{
    device : 'ext_temperature',
    index : 0, 
    attribute : 'overtemp_threshold_tC',
    value : 90
},
{
    device : 'ext_temperature',
    index : 0, 
    attribute : 'overtemp_act',
    value : 'relay_on'
}
...
]
```
To understand the properties please have a look at: 
https://shelly-api-docs.shelly.cloud/gen1/#shelly1-1pm-settings-ext_temperature-index
It always follows the same scheme "/settings/<device>/<index>?<attribute>=<value>"

### Examples  
[**shelly settings flow**](examples/settings.json) 



## Relays (Shelly 1, 2, 1PM, 1L, Plug, PlugS, Uni)
The node is able to turn on and turn off a shelly switch. It outputs the status of all relays after every interaction with the shelly device.
Turning on is done by sending the following payload into the input. The relay number is optional and defaults to 0.
Note that the UNI can also deliver the ADCS values in the status.


```
{
    relay : 0,
	timer : 1,
	on : true
}
```

or you can make use of the alternative notation:


```
{
    relay : 0,
	timer : 1,
	turn : 'toggle'
}
```
turn can be one of the following: 'toggle', 'on', 'off'
timer is optional flip back timer in seconds 

Right after having sent the request to the shelly device a status request is done. The relays property of the response is output on output 1.

If you only want to get the current status of the switch without turning on or off you should leave the msg.payload blank.
This is useful, when you want to poll for the status cyclically.

The output of the node is an array of status objects for every relay of the switch:


```
relays : [
    {
        ison : true,
	    ...
    },
    {
        ison : true,
	    ...
    },
],
meters : [
],
inputs : [
],
adcs : [
]
```

### Examples  
[**shelly switch flow**](examples/switch.json) 
[**shelly uni flow**](examples/uni.json) 



## Measure (Shelly EM, EM3)
The node is able to turn on and turn off a shelly switch. It outputs the status of all relays after every interaction with the shelly device.
Turning on is done by sending the following payload into the input. The relay number is optional and defaults to 0.


```
{
    relay : 0,
	timer : 1,
	on : true
}
```

or you can make use of the alternative notation:


```
{
    relay : 0,
	timer : 1,
	turn : 'toggle'
}
```
turn can be one of the following: 'toggle', 'on', 'off'
timer is optional flip back timer in seconds 

Right after having sent the request to the shelly device a status request is done. The relays property of the response is output on output 1.

If you only want to get the current status of the switch without turning on or off you should leave the msg.payload blank.
This is useful, when you want to poll for the status cyclically.

The output of the node is an array of status objects for every relay of the switch:


```
relays : [
    {
        ison : true,
	    ...
    },
    {
        ison : true,
	    ...
    },
],
meters : [
],
```

### Download of historical data
Devices like the EM and EM3 store data. You can download the historical time series data as follows:

```
[
    {
        download : [0, 1, 2],
	    ...
    },
]
```

The download variable contains a list of channels that should be downloaded. This can be either one or more numbers. Note that downloading
from the device can take some seconds as it depends on the size of the gathered data.
Data is sent to output 2.


### Examples  
[**shelly EM flow**](examples/emeasure.json)  
[**shelly EM download CSV flow**](examples/emeasure2.json)  



## Roller Shutter (Shelly 2, Shelly 2.5)

A node that controls a shelly roller shutter device (Shelly 2.5).
The relay number is optional and defaults to 0. The following object for open or close the roller shutter:

```
{
    roller : 0,
	go : 'open'
}
```

```
{
    roller : 0,
	go : 'close'
}
```

```
{
    roller : 0,
	go : 'to_pos',
	roller_pos: 50
}
```


If device is in relay mode: Turning on is done by sending the following payload into the input. The relay number is optional and defaults to 0.

```
{
    relay : 0,
	on : true
}
```

or you can make use of the alternative notation:


```
{
    relay : 0,
	turn : 'toggle'
}
```
turn can be one of the following: 'toggle', 'on', 'off'

Right after having sent the request to the shelly device a status request is done. The roller property of the response is output on output 1.

If you only want to get the current status of the switch without turning on or off you should leave the msg.payload blank.
This is useful, when you want to poll for the status cyclically.

The output of the node is an array of status objects for every roller and every relay of the roller shutter:

```
{
rollers : [
        {
            state : 'open',
			current_pos: 50,
	        ...
        },
    ],
relays : [
        {
		    ison : true,
			...
		},
	],
meters : [
]
```

### Examples:  
[**shelly roller flow**](examples/roller.json)  
[**shelly roller2 flow**](examples/roller2.json)  
[**shelly roller3 flow**](examples/roller3.json)  



## Dimmer (Shelly Dimmer 1/2, Shelly Bulb Duo, Vintage)
The node is able to turn on and turn off a shelly dimmer or shelly bulb duo and set its brightness. It outputs the status of all lights after every interaction with the shelly device.
Turning on is done by sending the following payload into the input. The light number is optional and defaults to 0. The brightness can be set between 0 and 100.


```
{
    light : 0, // default = 0 (not needed for bulb duo)
    on : true,
    brightness: 100,
	white: 100, // for bulb duo
	temp : 2700, // for bulb duo (same as white but in K 2700 - 6500)
	transition : 0 // for bulb duo (0..5000ms),
	timer : 1, // flip back timer in seconds,
	dim : 'up', // up, down, stop
	step : 10, // dim step in %
}
```

Like in the switch node you can replace on with turn and choose a value from the following: 'toggle', 'on', 'off'

You can also control the shelly state and brightness independently.

```
{
on: true
}
```

and

```
{
brightness: 100
}
```

Right after having sent the request to the shelly device a status request is done. The relays property of the response is output on output 1.  
This feature can optionally be disabled by unticking the `status` checkbox in the node configuration options.

If you only want to get the current status of the dimmer without turning on or off you should leave the msg.payload blank. This is useful, when you want to poll for the status cyclically.

The output of the node is an array of status objects for every light of the dimmer:


```
lights : [
    {
        ison : true,
		brightness: 100
	    ...
    },
    {
        ison : true,
		brightness: 100
	    ...
    },
],
meters : [
]
```

### Examples:  
[**shelly dimmer flow**](examples/dimmer.json)  
[**shelly bulb duo flow**](examples/bulbduo.json)  


## Thermostat (Shelly TRV)
The node is able to control a shelly TRV. It outputs the status of all thermostats after every interaction with the shelly device.
Turning on is done by sending the following payload into the input.


```
{
    position : 0..100, // 0 = closed
	temperature : 4..31, // target temperature in C
    schedule : true,
	scheduleProfile : 1..5,
	boostMinutes : 0..n
}
```

Right after having sent the request to the shelly device a status request is done. The thermostats property of the response is output on output 1.  
This feature can optionally be disabled by unticking the `status` checkbox in the node configuration options.

If you only want to get the current status of the TRV leave the msg.payload blank. This is useful, when you want to poll for the status cyclically.

### Examples:  
[**shelly TRV flow**](examples/trv.json) 



## RGBW (Shelly RGBW2, Shelly Bulb RGWB)
The node is able to control a RGBW LED light strip or a bulb RGBW. 

If you only want to get the current status of the node without turning on or off you should leave the msg.payload blank. This is useful, when you want to poll for the status cyclically.

The node accepts the following input


```
{
    red : 0,
    green : 0,
	blue : 0,
	white : 0,
	temp : 5000, // bulb
	gain : 0,
	brightness : 0, // bulb
	effect : 1,
	on : true,
	timer : 0,
	transition : 0, // bulb
}
```

red, green, blue, white can be between 0 and 255. 
gain can be a value between 0 and 100.
brightness can be a value between 0 and 100.
effect = 0 means no effect. 
timer can be a value in seconds to flip back on/off
transition can be a value in milliseconds between 0 and 5000
temp can be a value in K between 3000 and 6500 for white

```
lights : [
	{
		light : 0,
		on : true,
		brightness: 100,
		timer : 0,
	}
]
```

light 0 .. 3 is the number of the strip. 
brightness can be a value between 0 and 100. 
timer can be a value in seconds to flip back on/off

### Examples:  
[**shelly RGBW2 color flow**](examples/rgbw2color.json)  
[**shelly RGBW2 color effect flow**](examples/rgbw2colorloop.json)  
[**shelly RGBW2 white flow**](examples/rgbw2white.json)  
[**shelly bulb RGBW flow**](examples/bulbrgbw.json)  



## Sensor (Shelly Window/Door Node 1/2, Shelly Flood, Shelly H&T, Shelly Motion 1/2 )
The node is able to poll a shelly window/door, motion, gas, ... sensor. It outputs the sensor status together with battery and sensor values on every change sensor status.
Note that some sensors sleep when nothing is detected and is thus not accessible via REST.

The output of the window, door sensor is as follows:


```
{
    sensor
	{
		state: 'close',
		is_valid: true
	},

	lux
	{
		value: 150,
		illumination: 'twilight',
		is_valid: true
	},

	bat
	{
		value: 100,
		voltage: 6.01
	}
}
```

The output of the motion sensor is as follows:


```
{
    sensor
	{
		motion: true,
		vibration: true,
		timestamp: 12345,
		active: true,
		is_valid: true
	},

	lux
	{
		value: 150,
		illumination: 'twilight',
		is_valid: true
	},

	bat
	{
		value: 100,
		voltage: 6.01
	}
}
```

### Examples:  
[**shelly door flow**](examples/door.json)  
[**shelly motion flow**](examples/motion.json)  



## Button (Shelly Button, I3)
The node is able to control a shelly button. It outputs the status of all inputs after every interaction with the shelly device.
Turning on is done by sending the following payload into the input. The input number defaults to 0.


```
{
    input : 0,
	event : 'S'
}
```

Event can be one of the following S=short push, SS=double short push, SSS=triple short push, L=long push (and LS=long short and SL=short long for the I3).
Right after having sent the request to the shelly device a status request is done. The inputs property of the response is output on output 1.

If you only want to get the current status of the switch without turning on or off you should leave the msg.payload blank.
This is useful, when you want to poll for the status cyclically.

The output of the node is an array of status objects for every relay of the switch:


```
[
]
```

Note that the button is not always reachable as it falls to sleep. This is not the case for the I3.

### Examples:  
[**shelly button flow**](examples/button.json) 



# Shelly Node (Generation 2, Generation 3, Generation 4) 
See also https://shelly-api-docs.shelly.cloud/gen2/
See also https://shelly-api-docs.shelly.cloud/gen2/Devices/ShellyPlus1PM
The node can communicate with several shelly types. You must select the correct device type from the combobox when configuring the node.
The msg.payload property can be used to issue commands (see examples below). Note that you can send multiple commands at once by creating an array in msg.payload.

## callback mode vs polling mode
Unlike generation 1 devices the new generation supports the usage of scripts. In polling mode the node just behaves like the generation 1 node.
In callback mode a script is uploaded to the shelly which sends all notification events to the node. The node needs to open a network port to be able to receive these messages.
You must configure this network port, make sure that it is not already in use. If node-red runs inside a docker container or any other bridged network then you should also configure the hostname
under that the shelly device can reach the node-red server (Leave this field empty if you run inside the same network segment).


## Relay (Plus 1, Plus 1 PM, Plus 2 PM, Plus UNI, Pro 1, Pro 1 PM, Pro 2, Pro 2 PM, Pro 4 PM, Plug US, Mini, 1PM Mini, PM Mini, Shelly Wall Display)
The node is able to turn on and turn off a shelly switch. It outputs the status after every interaction with the shelly device.
Turning on is done by sending the following payload into the input. The relay number is optional and defaults to 0.


```
{
    method : 'Switch.Set'
	parameters : {
        id : 0,
        on : true,
        toggle_after : 2 // optional flip back time in seconds
    }
}
```

or you can make use of the alternative toggle command:


```
{
    method : 'Switch.Toggle'
	...
}
```

Note that toggle_after is optional. The unit is seconds.
Right after having sent the request to the shelly device a status request is done.

If you only want to get the current status of the switch without turning on or off you should leave the msg.payload blank.
This is useful, when you want to poll for the status cyclically.

The output of the node is the full status object of the device.
See https://shelly-api-docs.shelly.cloud/gen2/Overview/CommonServices/Shelly

For further rpc commands see the shelly documentation.

### Examples:  
[**shelly switch gen 2 flow**](examples/switchplus.json) 
[**shelly rollerplus flow (Shelly Plus 2 PM)**](examples/rollerplus.json) 


## Dimmer (Plus Dimmer 0-10V)
The node is able to turn on and turn off a shelly dimmer. It outputs the status after every interaction with the shelly device.
Turning on is done by sending the following payload into the input. The light number is optional and defaults to 0.


```
{
    method : 'Light.Set'
	parameters : {
        id : 0,
        on : true,
		brightness : 100,
		transition_duration : 1, // optional transition time in seconds
        toggle_after : 2 // optional flip back time in seconds
    }
}
```

or you can make use of the alternative toggle command:


```
{
    method : 'Light.Toggle'
	...
}
```

Note that toggle_after is optional. The unit is seconds.
Right after having sent the request to the shelly device a status request is done.

If you only want to get the current status of the light without turning on or off you should leave the msg.payload blank.
This is useful, when you want to poll for the status cyclically.

The output of the node is the full status object of the device.
See https://shelly-api-docs.shelly.cloud/gen2/Overview/CommonServices/Shelly

For further rpc commands see the shelly documentation.

### Examples:  
[**shelly dimmer gen 2 flow**](examples/dimmerplus.json) 


## RGBW PM (Plus RGBWr 12/24V)
The node is able to turn on and turn off a shelly RGBW PM Plus. It outputs the status after every interaction with the shelly device.
Turning on is done by sending the following payload into the input. The light number is optional and defaults to 0.
The device can be operated in color and white mode. 
For color mode you can use the following example:

```
{
    method : 'RGBW.Set'
	parameters : {
        id : 0,
        on : true,
		brightness : 100,
		transition_duration : 1, // optional transition time in seconds
        toggle_after : 2 // optional flip back time in seconds
    }
}
```

or you can make use of the alternative toggle command:


```
{
    method : 'RGBW.Toggle'
	...
}
```

For white mode you can use the following example:

```
{
    method : 'Light.Set'
	parameters : {
        id : 0,
        on : true,
		brightness : 100,
		transition_duration : 1, // optional transition time in seconds
        toggle_after : 2 // optional flip back time in seconds
    }
}
```


Note that toggle_after is optional. The unit is seconds.
Right after having sent the request to the shelly device a status request is done.

If you only want to get the current status of the light without turning on or off you should leave the msg.payload blank.
This is useful, when you want to poll for the status cyclically.

The output of the node is the full status object of the device.
See https://shelly-api-docs.shelly.cloud/gen2/Overview/CommonServices/Shelly

For further rpc commands see the shelly documentation.

### Examples:  
[**shelly RGBW plus PM gen 2 flow**](examples/rgbwpmplus.json) 


## Button (Shelly Plus I4)
The node is able to control a shelly button. It outputs the status of all inputs after every interaction with the shelly device.
See https://shelly-api-docs.shelly.cloud/gen2/Components/FunctionalComponents/Input

The output of the node is an array of status objects for every relay of the switch:


```
[
]
```

### Examples:  
[**shelly button plus flow**](examples/buttonplus.json) 



## Sensor (Shelly Plus H&T, Plus Smoke)
The node is able to control a shelly sensor. Usually sensors sleep all the time to save energy.
Hence you will get an error when polling for the status but sometimes when the device wakes up you will receive valid data.
Another possibility is to use the callback mode. Unlike other 2. generation devices sensors do often not support scripts.
Therefore webhooks are installed as soon as the device is not sleeping. When the shelly calls the webhook, the node gets the 
status and sends it to the output.
You can wake up your device manually on redeploy to speed up initialization. Otherwise errors will be generated in the debugging
pane telling you that installation of the webhook failed.



## BLU Gateway (Shelly BLU Gateway)
The node is able to control a shelly BLU gateway. This node should be only used with callback mode and event output.
It uploads two scripts: one for the callback like in all other gen 2 devices and one that scans for bluetooth signals.
This script was taken from https://github.com/ALLTERCO/shelly-script-examples/blob/main/ble-shelly-blu.js and is licensed 
under the apache 2.0 license!

The output of the node is an event object. Bluetooth event objects have the event name "shelly-blu".


```
msg.payload.info.event === "shelly-blu"
```


You can take the mac-address to find out what BLU device sent the messages:


```
msg.payload.info.data.address
```


### Examples:  
[**shelly BLU gateways flow**](examples/blugateway.json) 



## Some notes about BLU Support 
Almost all gen2+ device support bluetooth and can be used as blu gateway by using callback mode and activating
the gateway support in the config node. Messages from the BLU devices are in BTHomeV2 format: https://bthome.io/format/



## BLU RC Button 4
The node is able to control a shelly RC button 4. This device communicates via bluetooth. You must use at least one shelly as bluetooth
gateway to be able to receive message in node-red from that device.
This gateway node should be only used with callback mode and event output.
It uploads two scripts: one for the callback like in all other gen 2 devices and one that scans for bluetooth signals.
This script was taken from https://github.com/ALLTERCO/shelly-script-examples/blob/main/ble-shelly-blu.js and is licensed 
under the apache 2.0 license!

The output of the node is an event object. Bluetooth event objects have the event name "shelly-blu".

BLU devices contain a detailed description about the types that are used: E.g. the documenation for the shelly RC button 4
can be found here: https://shelly-api-docs.shelly.cloud/docs-ble/Devices/wall_us/
Type 0x3A is tranmitted if a button is pressed. The value can be on of the following: 
0x00 - none (button not pressed)
0x01 - press
0x02 - double press
0x03 - triple press
0x04 - long press
0xFE - hold
The buttons are transmitted as an array with the values mentioned above.

```
msg.payload.info.event === "shelly-blu"
```


You can take the mac-address to find out what BLU device sent the messages:


```
msg.payload.info.data.address
```


### Examples:  
[**shelly BLU RC button 4 flow**](examples/blubutton4.json) 



# Shelly REST API
For a complete documentation see also
https://shelly-api-docs.shelly.cloud/#common-http-api



# Shelly Cloud API
See also https://shelly-api-docs.shelly.cloud/cloud-control-api/communication
The node can communicate with your shellies via cloud API. You need to create an authentication key in your shelly app and enter it into the config node.
All devices have unique IDs. You can configure the ID in the config node or send it into the node, just as you prefer.
Note that the cloud API is limited to 1 call per second. If you call too fast you will likely receive an error 401.
You can get the status of a device by simply triggering the node using a msg.payload as follows 
contains the id of the device



```
{
	type : 'status',
    id : 'your device id here in hex',
}
```

## Listing all devices
Similar to retrieving the status of a device, you can retrieve the status of all devices by changing the type to "status_all" and removing the "id" line:

```
{
	type : 'status_all'
}
```


## Relay
You can control relays as follows:


```
{
    type : 'relay',
    id : 'your device id here in hex',
	channel : 0,
	turn : on | off
}
```

### Examples  
[**shelly cloud flow**](examples/cloud.json) 


## Roller
You can control rollers as follows:


```
{
    type : 'roller',
    id : 'your device id here in hex',
	direction : open | close | stop
	pos : 0..100
}
```

Please use direction or pos here.


### Examples  
[**shelly cloud flow**](examples/cloud.json) 

## Light
You can control lights as follows:


```
{
    type : 'light',
    id : 'your device id here in hex',
	channel : 0,
	turn : on | off
	
	white : 0..255
	red : 0..255
	green : 0..255
	blue : 0..255
	gain : 0..255
	brightness : 0..255
}
```

Please see documentation. It depends on if you have RGBW or White lights.


### Examples  
[**shelly cloud flow**](examples/cloud.json) 


## Bulk Control
You can turn on|off many relays or rollers with one single call as follows:


```
{
    type : 'relays',
    turn : on | off,
	devices : [
		{
		  id : 'your device id here in hex'
		  channel : 0
		},
		{
		    ...
		}
	]
}
```


# License

Author: Karl-Heinz Wind

The MIT License (MIT)
Copyright (c) 2019 by Karl-Heinz Wind

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NON-INFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
