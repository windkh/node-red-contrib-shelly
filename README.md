# Shelly nodes for node-red
[![Platform](https://img.shields.io/badge/platform-Node--RED-red)](https://nodered.org)
![License](https://img.shields.io/github/license/windkh/node-red-contrib-shelly.svg)
[![NPM](https://img.shields.io/npm/v/node-red-contrib-shelly?logo=npm)](https://www.npmjs.org/package/node-red-contrib-shelly)
[![Known Vulnerabilities](https://snyk.io/test/npm/node-red-contrib-shelly/badge.svg)](https://snyk.io/test/npm/node-red-contrib-shelly)

This package contains nodes for controlling shelly devices

# Warning
This package is under construction. Right now only the switches like 
- shelly switch 1 (PM), 2 
- shelly plug
- shelly 2.5 (roller shutter) 
- shelly dimmer
- shelly uni
are supported.
Other may work but are not really tested so far.


# Thanks for your donation
If you want to support this free project. Any help is welcome. You can donate by clicking one of the following links:

<a target="blank" href="https://blockchain.com/btc/payment_request?address=1PBi7BoZ1mBLQx4ePbwh1MVoK2RaoiDsp5"><img src="https://img.shields.io/badge/Donate-Bitcoin-green.svg"/></a>
<a target="blank" href="https://www.paypal.me/windkh"><img src="https://img.shields.io/badge/Donate-PayPal-blue.svg"/></a>

# Credits
gerdemann for providing the roller shutter code
Gophlin for provider the Dimmer (SL) code
minuq for providing pull request for issue #7

# Changelog
Changes can be followed [here](/CHANGELOG.md)


# Shelly Switch Node
The node is able to turn on and turn off a shelly switch. It outputs the status of all relays after every interaction with the shelly device.
Turning on is done by sending the following payload into the input. The relay number is optional and defaults to 0.


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
	turn : "toggle"
}
```
turn can be one of the following: "toggle", "on", "off"

Right after having sent the request to the shelly device a status request is done. The relays property of the response is output on output 1.

If you only want to get the current status of the switch without turning on or off you should leave the msg.payload blank.
This is useful, when you want to poll for the status cyclically.

The output of the node is an array of status objects for every relay of the switch:


```
[
    {
        ison : true,
	    ...
    },
    {
        ison : true,
	    ...
    },
]
```


# Shelly Door Node
The node is able to poll a shelly door sensor. It outputs the sensor status together with battery and lux sensor values on every change of the door status.
Note that the sensor sleeps when nothing is detected and is thus not accessible via REST.

The output of the node is as follows:


```
{
    sensor
	{
		state: "close",
		is_valid: true
	},

	lux
	{
		value: 150,
		illumination: "twilight",
		is_valid: true
	},

	bat
	{
		value: 100,
		voltage: 6.01
	}
}
```

# Shelly Roller Shutter Node

A node that controls a shelly roller shutter device (Shelly 2.5).
The relay number is optional and defaults to 0. The following object for open or close the roller shutter:

```
{
    roller : 0,
	go : "open"
}
```

```
{
    roller : 0,
	go : "close"
}
```

```
{
    roller : 0,
	go : "to_pos",
	roller_pos: 50
}
```

Right after having sent the request to the shelly device a status request is done. The roller property of the response is output on output 1.

If you only want to get the current status of the switch without turning on or off you should leave the msg.payload blank.
This is useful, when you want to poll for the status cyclically.

The output of the node is an array of status objects for every roller of the roller shutter:

```
[
    {
        state : "open",
	    ...
    }
]
```

```
[
    {
        state : "close",
	    ...
    }
]
```

```
[
    {
        state : "open",
        current_pos: 50,
	    ...
    }
]
```

# Shelly Dimmer (SL) Node
The node is able to turn on and turn off a shelly dimmer and set its brightness. It outputs the status of all lights after every interaction with the shelly device.
Turning on is done by sending the following payload into the input. The light number is optional and defaults to 0. The brightness can be set between 0 and 100.


```
{
    light : 0,
    on : true,
    brightness: 100
}
```

Like in the switch node you can replace on with turn and choose a value from the following: "toggle", "on", "off"

Right after having sent the request to the shelly device a status request is done. The relays property of the response is output on output 1.

If you only want to get the current status of the dimmer without turning on or off you should leave the msg.payload blank. This is useful, when you want to poll for the status cyclically.

The output of the node is an array of status objects for every light of the dimmer:


```
[
    {
        ison : true,
	    ...
    },
    {
        ison : true,
	    ...
    },
]
```


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
