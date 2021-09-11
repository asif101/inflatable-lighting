const { rgb2Int } = require('../colors')

exports.rainbow = (function () {
    let module = {}
    let wheelPosition = 0

    module.next = function (pixelData) {
        setArrayNextRainbow(pixelData)
    }

    function setArrayNextRainbow(pixelData) {
        wheelPosition = (wheelPosition + 1) % 256
        for (let i = 0; i < pixelData.length; i++) {
            pixelData[i] = colorwheel(wheelPosition)
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