# Shelly nodes for node-red
[![Platform](https://img.shields.io/badge/platform-Node--RED-red)](https://nodered.org)
![License](https://img.shields.io/github/license/windkh/node-red-contrib-shelly.svg)
[![NPM](https://img.shields.io/npm/v/node-red-contrib-shelly?logo=npm)](https://www.npmjs.org/package/node-red-contrib-shelly)
[![Known Vulnerabilities](https://snyk.io/test/npm/node-red-contrib-shelly/badge.svg)](https://snyk.io/test/npm/node-red-contrib-shelly)
[![Downloads](https://img.shields.io/npm/dm/node-red-contrib-shelly.svg)](https://www.npmjs.com/package/node-red-contrib-shelly)
[![Total Downloads](https://img.shields.io/npm/dt/node-red-contrib-shelly.svg)](https://www.npmjs.com/package/node-red-contrib-shelly)
[![Package Quality](http://npm.packagequality.com/shield/node-red-contrib-shelly.png)](http://packagequality.com/#?package=node-red-contrib-shelly)
![Build](https://img.shields.io/github/workflow/status/windkh/node-red-contrib-shelly/Node.js%20CI?event=push)
[![Open Issues](https://img.shields.io/github/issues-raw/windkh/node-red-contrib-shelly.svg)](https://github.com/windkh/node-red-contrib-shelly/issues)
[![Closed Issues](https://img.shields.io/github/issues-closed-raw/windkh/node-red-contrib-shelly.svg)](https://github.com/windkh/node-red-contrib-shelly/issues?q=is%3Aissue+is%3Aclosed)
...

This package contains nodes for controlling shelly devices via the following API:
https://shelly-api-docs.shelly.cloud/


# Dependencies
This package depends on the following libraries
- Axios see https://github.com/axios/axios
- Fastify see https://github.com/fastify/fastify
- IP see https://github.com/indutny/node-ip


# Supported Devices
This package is under construction. Right now the following devices are supported

Generation 1 devices:
- Shelly Switch 1 (PM), 2, L,  
- Shelly Plug PlugS
- Shelly 2.5 (roller shutter) 
- Shelly Dimmer / Shelly Bulb Duo, Vintage
- Shelly Door / Shelly Door 2
- Shelly RGBW2 / Shelly Bulb RGBW
- Shelly Motion
- Shelly Emeasure (EM, EM3)
- Shelly UNI
- Shelly TRV
- Shelly Button / I3

Generation 2 devices:
- Shelly Plus l, Plus 1 PM, Plus 2 PM, I4
- Shelly Pro 1, Pro 1 PM, Pro 2 PM, Pro 4 PM
- Shelly US Plug


Others may work but are not really tested so far.


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
	transition : 0 // for bulb duo (0..5000ms)
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
[**shelly dimmer flow**](examples/bulbduo.json)  
[**shelly bulb duo flow**](examples/dimmer.json)  


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
    mode : 'color', // or 'white' is an optional value for dynamically reconfiguring the device.
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
mode is optional an used for reconfiguring the device. Select auto in the configuration if mode should be dynamically changed.

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



## Sensor (Shelly Window/Door Node 1/2,
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



# Shelly Node (Generation 2) 
See also https://shelly-api-docs.shelly.cloud/gen2/
See also https://shelly-api-docs.shelly.cloud/gen2/Devices/ShellyPlus1PM
The node can communicate with several shelly types. You must select the correct device type from the combobox when configuring the node.

## callback mode vs polling mode
Unlike generation 1 device the new generation supports the usage of scripts. In polling mode the node just behaves like the generation 1 node.
In callback mode a script is uploaded to the shelly which sends all notification events to the node. The node needs to open a network port to be able to receive these messages.
You must configure this network port, make sure that it is not already in use. If node-red runs inside a docker container or any other bridged network then you should also configure the hostname
under that the shelly device can reach the node-red server (Leave this field empty if you run inside the same network segment).
Right now only the Plus I4 is supported with callback mode. More will follow.


## Relay (Plus 1, Plus 1 PM, Plus 2 PM, Pro 1, Pro 1 PM, Pro 2, Pro 2 PM, Pro 4 PM, Plug US)
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



# Shelly REST API
For a complete documentation see also
https://shelly-api-docs.shelly.cloud/#common-http-api



# License

Author: Karl-Heinz Wind

The MIT License (MIT)
Copyright (c) 2019 by Karl-Heinz Wind

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NON-INFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
