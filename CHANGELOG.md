# Changelog
All notable changes to this project will be documented in this file.

## [10.8.0] - 2022-10-31
###  partially reverted changes from 10.7.0 - [#101](https://github.com/windkh/node-red-contrib-shelly/issues/101)

## [10.7.0] - 2022-10-29
###  replaced crypto package - [#99](https://github.com/windkh/node-red-contrib-shelly/issues/99)
###  replaced fs package - [#96](https://github.com/windkh/node-red-contrib-shelly/issues/96)

## [10.6.0] - 2022-10-28
###  added try catch when axios is called - [#98](https://github.com/windkh/node-red-contrib-shelly/issues/98)

## [10.5.0] - 2022-10-15
###  Webhooks and scripts are automatically removed when switchingback to polling or none - [#83](https://github.com/windkh/node-red-contrib-shelly/issues/83)

## [10.4.0] - 2022-10-08
###  Added throttle mode to cloud node - [#92](https://github.com/windkh/node-red-contrib-shelly/issues/92)
###  Status can be polled using cloud node

## [10.3.0] - 2022-10-08
###  SHEM3 can be used as relay
###  Gen2 Switches fixed

## [10.2.0] - 2022-10-08
###  Added SHPLG2-1 - [#95](https://github.com/windkh/node-red-contrib-shelly/issues/95)

## [10.1.0] - 2022-10-09
###  Fixed webhook problem - [#94](https://github.com/windkh/node-red-contrib-shelly/issues/94)
###  Fixed EM problems 

## [10.0.0] - 2022-10-07
###  Breaking change in cloud API - [#29](https://github.com/windkh/node-red-contrib-shelly/issues/29)

## [9.17.0] - 2022-10-06
###  Added support for cloud API - [#29](https://github.com/windkh/node-red-contrib-shelly/issues/29)

## [9.16.1] - 2022-10-04
###  First version of cloud node: status can be retrieved now

## [9.16.0] - 2022-09-18
###  fixed webhook for TRV and Motion: the devices support intervals and must be configured in a different way.

## [9.15.0] - 2022-09-16
###  fixed examples - [#89](https://github.com/windkh/node-red-contrib-shelly/issues/89)

## [9.14.0] - 2022-09-05
###  fixed RGBW2: mode removed - [#88](https://github.com/windkh/node-red-contrib-shelly/issues/88)

## [9.13.0] - 2022-09-04
###  added callback support for I3 - [#69](https://github.com/windkh/node-red-contrib-shelly/issues/69)

## [9.12.0] - 2022-09-04
###  fixed gen 2 authentication: Digest auth is used now - [#79](https://github.com/windkh/node-red-contrib-shelly/issues/79)
###  fixed - [#87](https://github.com/windkh/node-red-contrib-shelly/issues/87)

## [9.11.0] - 2022-09-03
###  added webhook support for Shelly Button 1 - [#85](https://github.com/windkh/node-red-contrib-shelly/issues/85)

## [9.10.0] - 2022-09-03
###  fixed - [#84](https://github.com/windkh/node-red-contrib-shelly/issues/84)

## [9.9.0] - 2022-09-02
###  fixed bug in 9.8.0

## [9.8.0] - 2022-09-02
###  added webhook support for gen1 sensors to avoid polling - [#60](https://github.com/windkh/node-red-contrib-shelly/issues/60)

## [9.7.0] - 2022-09-02
###  added support for Shelly Plus H&T - [#71](https://github.com/windkh/node-red-contrib-shelly/issues/71)

## [9.6.0] - 2022-08-26
###  fixed - [#81](https://github.com/windkh/node-red-contrib-shelly/issues/81)

## [9.5.0] - 2022-07-18
###  added support for SNPL US version - [#78](https://github.com/windkh/node-red-contrib-shelly/issues/78)

## [9.4.0] - 2022-06-30
###  fixed - [#77](https://github.com/windkh/node-red-contrib-shelly/issues/77)

## [9.3.1] - 2022-06-06
### added hostname to gen 2 server to support node-red running insode docker.

## [9.2.0] - 2022-04-30
### fixed - [#74](https://github.com/windkh/node-red-contrib-shelly/issues/74)

## [9.1.0] - 2022-04-30
### fixed - [#74](https://github.com/windkh/node-red-contrib-shelly/issues/74)

## [9.0.0] - 2022-05-29
### added callback support for Plus I4

## [8.2.0] - 2022-04-27
### added support for Plus I4 - [#56](https://github.com/windkh/node-red-contrib-shelly/issues/56)

## [8.1.0] - 2022-04-18
### added pro models to supported gen 2 devices - [#66](https://github.com/windkh/node-red-contrib-shelly/issues/66)

## [8.0.0] - 2022-03-31
### full shelly gen 2 rpc protocol support. See example in examples folder.

## [7.3.0] - 2022-03-26
### fixed emeters output - [#63](https://github.com/windkh/node-red-contrib-shelly/issues/63)

## [7.2.0] - 2022-03-23
### added support for setting attributes - [#62](https://github.com/windkh/node-red-contrib-shelly/issues/62)

## [7.1.1] - 2022-03-11
### code cleanup.

## [7.1.0] - 2022-03-11
### fixed bug when username and password was set.

## [7.0.0] - 2022-03-11
### Merged Shelly Plus 1PM node into new GEN 2 node - [#59](https://github.com/windkh/node-red-contrib-shelly/issues/59)

## [6.0.0] - 2022-03-10
### Merged RGBW node into new GEN 1 node - [#58](https://github.com/windkh/node-red-contrib-shelly/issues/58)

## [5.0.0] - 2022-03-10
### major refactoring - shelly gen 1 node replaces all relays and woller shutter nodes

## [4.8.0] - 2022-02-22
### username and password can be passed via msg.payload (like hostname)

## [4.7.1] - 2022-02-21
### fixed RGBW2 node - [#53](https://github.com/windkh/node-red-contrib-shelly/issues/53)

## [4.6.0] - 2022-02-20
### timer support for uni - [#35](https://github.com/windkh/node-red-contrib-shelly/issues/35)

## [4.5.0] - 2022-02-20
### timer is stopped after redeploy - [#46](https://github.com/windkh/node-red-contrib-shelly/issues/46)

## [4.4.0] - 2022-02-19
### added support for button I3 - [#50](https://github.com/windkh/node-red-contrib-shelly/issues/50)
### experimental 

## [4.3.1] - 2022-02-13
### updated lock file

## [4.3.0] - 2022-02-13
### updated axios to 0.26.0

## [4.2.0] - 2022-02-09
### added support for shelly TRV - [#48](https://github.com/windkh/node-red-contrib-shelly/issues/48)
### removed node red tags in package json 

## [4.1.4] - 2022-02-03
### changed node red to 1.3.7 and nodejs to 12.0.0

## [4.1.3] - 2022-02-03
### changed node red to 1.0 and nodejs to 10.0

## [4.1.2] - 2022-02-01
### updated axios dependency to 0.25.0

## [4.1.1] - 2022-02-01
### added missing node-red tags

## [4.1.0] - 2021-12-23
### Cyclically sending of status can be turned off - [#47](https://github.com/windkh/node-red-contrib-shelly/issues/47)

## [4.0.0] - 2021-12-22
### fixed - [#46](https://github.com/windkh/node-red-contrib-shelly/issues/46)
All nodes will now send the status to the output when polling. Not only the color of the node is updated, 
but also an object is sent. 

## [3.4.0] - 2021-12-12
### Motion sensor configuration adapted - [#45](https://github.com/windkh/node-red-contrib-shelly/issues/45)

## [3.3.0] - 2021-12-08
### RGBW2 mode can be dynamically switched - [#44](https://github.com/windkh/node-red-contrib-shelly/issues/44)

## [3.2.0] - 2021-11-28
### hostname can be passed via msg.payload - [#42](https://github.com/windkh/node-red-contrib-shelly/issues/42)

## [3.1.0] - 2021-11-28
### replaced deprecated dependency request with axios - [#39](https://github.com/windkh/node-red-contrib-shelly/issues/39)

## [2.2.0] - 2021-11-28
### Shelly 2.5 supports relay mode - [#43](https://github.com/windkh/node-red-contrib-shelly/issues/43)

## [2.1.1] - 2021-11-21
### Shelly (PM) 1 plus support (first generation 2 device) - [#41](https://github.com/windkh/node-red-contrib-shelly/issues/41)

## [2.0.1] - 2021-11-21
### ping does not crash node-red for gen 2 devices like Shelly PM 1 plus - [#41](https://github.com/windkh/node-red-contrib-shelly/issues/41)

## [2.0.0] - 2021-11-14
### removed config option sendFullStatus for motion and door - [#36](https://github.com/windkh/node-red-contrib-shelly/issues/36)

## [1.16.0] - 2021-11-14
### added support for downloading CSV files from Shelly EM - [#37](https://github.com/windkh/node-red-contrib-shelly/issues/37)

## [1.15.0] - 2021-11-11
### added support for shelly UNI - [#34](https://github.com/windkh/node-red-contrib-shelly/issues/34)

## [1.14.0] - 2021-11-09
### added support for shelly bulb Duo - [#32](https://github.com/windkh/node-red-contrib-shelly/issues/32)

## [1.13.0] - 2021-11-09
### added support for shelly bulb RGBW - [#32](https://github.com/windkh/node-red-contrib-shelly/issues/32)

## [1.12.0] - 2021-10-25
### fixed RGBW2 node: when empty payload is received then status is polled from device.

## [1.11.0] - 2021-10-08
### fixed auth problem with motion sensor - [#31](https://github.com/windkh/node-red-contrib-shelly/issues/31)

## [1.10.1] - 2021-09-09
### new release

## [1.10.0] - 2021-09-09
### Beta support for shelly EM. - [#26](https://github.com/windkh/node-red-contrib-shelly/issues/26)

## [1.9.5] - 2021-07-18
### reworked Motion node now supports extra outputs for motion detected and vibration detected.

## [1.9.4] - 2021-07-17
### reworked RGBW2 node now supports setting white and color mode from within the config node.

## [1.9.2] - 2021-07-13
### reworked RGBW2 node: white mode supported. - [#25](https://github.com/windkh/node-red-contrib-shelly/issues/25)

## [1.8.2] - 2021-07-11
### Beta support for shelly motion. - [#17](https://github.com/windkh/node-red-contrib-shelly/issues/17)

## [1.8.1] - 2021-07-11
### Added missing section in Shelly-RGBW2 html

## [1.8.0] - 2021-07-11
### Beta support for ShellyRGBW2 node (not fully tested). - [#25](https://github.com/windkh/node-red-contrib-shelly/issues/25)

## [1.7.2] - 2021-06-07
### Connection status is polled now. - [#12](https://github.com/windkh/node-red-contrib-shelly/issues/12)

## [1.7.1] - 2021-06-07
### Code cleanup, enhanced readme for RGBW2 node.

## [1.7.0] - 2021-05-30
### Added experimental RGBW node - [#14](https://github.com/windkh/node-red-contrib-shelly/issues/14)

## [1.6.1] - 2021-05-30
### Added git workflows 

## [1.6.0] - 2021-05-30
### Get status can be suppressed in hig hperformance scenarios: e.g. dimmer - [#21](https://github.com/windkh/node-red-contrib-shelly/issues/21)

## [1.5.3] - 2020-12-22
### Added status to msg when polling status - [#9](https://github.com/windkh/node-red-contrib-shelly/issues/9)

## [1.5.2] - 2020-12-22
### Added lternative toggle notation for switch - [#10](https://github.com/windkh/node-red-contrib-shelly/issues/10)

## [1.5.1] - 2020-12-22
### Added UNI support - [#11](https://github.com/windkh/node-red-contrib-shelly/issues/11)

## [1.5.0] - 2020-11-07
### Moved examples to correct folder.

## [1.4.0] - 2020-08-23
### removed check box in dimmer node for sending the full status object.

## [1.3.5] - 2020-08-23
### msg.status contains the original status now (for experts)

## [1.3.4] - 2020-08-23
### updated to latest request 2.88.2

## [1.3.3] - 2020-08-23
### merged pull request
 - msg properties are not lost. - [#7](https://github.com/windkh/node-red-contrib-shelly/issues/7)
 
## [1.3.2]
### Added dimmer

## [1.3.1]
### Added roller shutter.

## [1.2.0]
### Added more options in configuration dialog.

## [1.2.0]
### Fixed bug when closing node on redeploy.

## [1.1.0]
### Added shelly door node.

## [1.0.0]
### Added shelly switch node with example flow.

## [0.1.0]
### Initial version: simple status node added.

**Note:** The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
