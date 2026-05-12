'use strict';

const utils = require('../../../lib/utils.js');

// Uses node.rgbwMode ('color' / 'white' / other) to decide which Shelly RGBW2
// endpoint family to target. The mode is set during initialiserRGBW1Async by
// reading the device's /settings.
async function inputParserRGBW1Async(msg, node /*, credentials */) {
    let route;
    if (utils.isMsgPayloadValid(msg)) {
        let command = msg.payload;

        let nodeMode = node.rgbwMode;
        if (nodeMode === 'color') {
            let red;
            if (command.red !== undefined) {
                if (command.red >= 0 && command.red <= 255) {
                    red = command.red;
                } else {
                    red = 255; // Default to full brightness
                }
            }

            let green;
            if (command.green !== undefined) {
                if (command.green >= 0 && command.green <= 255) {
                    green = command.green;
                } else {
                    green = 255; // Default to full brightness
                }
            }

            let blue;
            if (command.blue !== undefined) {
                if (command.blue >= 0 && command.blue <= 255) {
                    blue = command.blue;
                } else {
                    blue = 255; // Default to full brightness
                }
            }

            let white;
            if (command.white !== undefined) {
                if (command.white >= 0 && command.white <= 255) {
                    white = command.white;
                } else {
                    white = 255; // Default to full brightness
                }
            }

            let temperature;
            if (command.temp !== undefined) {
                if (command.temp >= 3000 && command.temp <= 6500) {
                    temperature = command.temp;
                } else {
                    // Default is undefined
                }
            }

            let gain;
            if (command.gain !== undefined) {
                if (command.gain >= 0 && command.gain <= 100) {
                    gain = command.gain;
                } else {
                    gain = 100; // Default to full gain
                }
            }

            let brightness;
            if (command.brightness !== undefined) {
                if (command.brightness >= 0 && command.brightness <= 100) {
                    brightness = command.brightness;
                } else {
                    // Default to undefined
                }
            }

            let effect;
            if (command.effect !== undefined) {
                if (command.effect >= 0) {
                    effect = command.effect;
                } else {
                    effect = 0; // Default to no effect
                }
            }

            let transition;
            if (command.transition !== undefined) {
                if (command.transition >= 0 && command.transition <= 5000) {
                    transition = command.transition;
                } else {
                    // Default is undefined
                }
            }

            let timer;
            if (command.timer !== undefined) {
                if (command.timer >= 0) {
                    timer = command.timer;
                } else {
                    timer = 0; // Default to no timer
                }
            }

            let turn;
            if (command.on !== undefined) {
                if (command.on == true) {
                    turn = 'on';
                } else {
                    turn = 'off';
                }
            } else if (command.turn !== undefined) {
                turn = command.turn;
            } else {
                turn = 'on';
            }

            // create route
            route = '/color/0?turn=' + turn;

            if (gain !== undefined) {
                route += '&gain=' + gain;
            }

            if (red !== undefined) {
                route += '&red=' + red;
            }

            if (green !== undefined) {
                route += '&green=' + green;
            }

            if (blue !== undefined) {
                route += '&blue=' + blue;
            }

            if (white !== undefined) {
                route += '&white=' + white;
            }

            if (temperature !== undefined) {
                route += '&temp=' + temperature;
            }

            if (brightness !== undefined) {
                route += '&brightness=' + brightness;
            }

            if (effect !== undefined) {
                route += '&effect=' + effect;
            }

            if (transition !== undefined) {
                route += '&transition=' + transition;
            }

            if (timer !== undefined && timer > 0) {
                route += '&timer=' + timer;
            }
        } else if (nodeMode === 'white') {
            let light = 0;
            if (command.light !== undefined) {
                if (command.light >= 0) {
                    light = command.light;
                } else {
                    light = 0; // Default to no 0
                }
            }

            let brightness;
            if (command.brightness !== undefined) {
                if (command.brightness >= 0 && command.brightness <= 100) {
                    brightness = command.brightness;
                } else {
                    brightness = 100; // Default to full brightness
                }
            }

            let temperature;
            if (command.temp !== undefined) {
                if (command.temp >= 3000 && command.temp <= 6500) {
                    temperature = command.temp;
                } else {
                    // Default is undefined
                }
            }

            let transition;
            if (command.transition !== undefined) {
                if (command.transition >= 0 && command.transition <= 5000) {
                    transition = command.transition;
                } else {
                    // Default is undefined
                }
            }

            let timer;
            if (command.timer !== undefined) {
                if (command.timer >= 0) {
                    timer = command.timer;
                } else {
                    timer = 0; // Default to no timer
                }
            }

            let turn;
            if (command.on !== undefined) {
                if (command.on == true) {
                    turn = 'on';
                } else {
                    turn = 'off';
                }
            } else if (command.turn !== undefined) {
                turn = command.turn;
            } else {
                turn = 'on';
            }

            // create route
            route = '/white/' + light + '?turn=' + turn;

            if (brightness !== undefined) {
                route += '&brightness=' + brightness;
            }

            if (temperature !== undefined) {
                route += '&temp=' + temperature;
            }

            if (transition !== undefined) {
                route += '&transition=' + transition;
            }

            if (timer !== undefined && timer > 0) {
                route += '&timer=' + timer;
            }
        } else {
            // node mode Auto or None
        }
    }
    return route;
}

module.exports = { inputParserRGBW1Async };
