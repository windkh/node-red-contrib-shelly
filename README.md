# Shelly nodes for node-red

![License](https://img.shields.io/github/license/windkh/node-red-contrib-shelly.svg)
![Release](https://img.shields.io/npm/v/node-red-contrib-shelly.svg)
![NPM](https://img.shields.io/npm/dm/node-red-contrib-shelly.svg)

This package contains nodes for controlling shelly devices

# Warning
This package is under construction. Right now only the switches like shelly switch 1, 2 and shelly plug is supported.



# Thanks for your donation
If you want to support this free project. Any help is welcome. You can donate by clicking one of the following links:

<a target="blank" href="https://blockchain.com/btc/payment_request?address=1PBi7BoZ1mBLQx4ePbwh1MVoK2RaoiDsp5"><img src="https://img.shields.io/badge/Donate-Bitcoin-green.svg"/></a>
<a target="blank" href="https://www.paypal.me/windkh"><img src="https://img.shields.io/badge/Donate-PayPal-blue.svg"/></a>



# History
Version 1.2.0
Added more options in configuration dialog.

Version 1.2.0
Fixed bug when closing node on redeploy.

Version 1.1.0
Added shelly door node.

Version 1.0.0
Added shelly switch node with example flow.

Version 0.1.0
Initial version: simple status node added.



# Shelly Switch Node
The node is able to turn on and turn off a shelly switch. It outputs the status of all relays after every interaction with the shelly device.
Turning on is done by sending the following payload into the input. The relay number is optional and defaults to 0.


```
{
    relay : 0,
	on : true
}
```

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
