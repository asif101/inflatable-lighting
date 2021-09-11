const { rgb2Int } = require('../colors')

exports.rainbow = (function () {
    let module = {}
    let pixelData = []
    let wheelPosition = 0

    module.init = function (NUM_LEDS) {
        pixelData = Array(NUM_LEDS).fill(0)
        setWheelPosition(0)
    }

    module.next = function () {
        setWheelPosition((wheelPosition + 1) % 256)
        return pixelData
    }

    function setWheelPosition(position) {
        wheelPosition = position
        for (let i = 0; i < pixelData.length; i++) {
            pixelData[i] = colorwheel((wheelPosition + i) % 256);
        }
    }

    return module
})()

// rainbow-colors, taken from http://goo.gl/Cs3H0v
function colorwheel(pos) {
    pos = 255 - pos;
    if (pos < 85) { return rgb2Int(255 - pos * 3, 0, pos * 3); }
    else if (pos < 170) { pos -= 85; return rgb2Int(0, pos * 3, 255 - pos * 3); }
    else { pos -= 170; return rgb2Int(pos * 3, 255 - pos * 3, 0); }
}