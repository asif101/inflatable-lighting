// const { rgb2Int } = require('../colors')

exports.colorWipe = (function () {
    let module = {}
    let position = 0
    let currentColorIndex = 0
    let colors = [0xFF0000, 0x00FF00, 0x0000FF]

    module.next = function (pixelData) {
        setArrayNext(pixelData)
    }

    module.reset = function() {
        position = 0
        currentColorIndex = 0
    }

    function setArrayNext(pixelData) {
        if(position + 1 > pixelData.length - 1) {
            position = 0
            currentColorIndex = (currentColorIndex + 1) % (colors.length)
        }
        else position++

        for (let i = 0; i < pixelData.length; i++) {
            pixelData[i] = i <= position ? colors[currentColorIndex] : 0x000000
        }
    }

    return module
})()
