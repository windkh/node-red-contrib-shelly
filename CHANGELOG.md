# Changelog
All notable changes to this project will be documented in this file.

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
