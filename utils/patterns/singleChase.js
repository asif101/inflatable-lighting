
exports.singleChase = (function () {
    let module = {}
    let position = 0

    module.next = function (pixelData) {
        setArrayNext(pixelData)
    }

    module.reset = function() {
        position = 0
    }

    function setArrayNext(pixelData) {
        if(position + 1 > pixelData.length - 1) {
            position = 0
        }
        else position++

        for (let i = 0; i < pixelData.length; i++) {
            pixelData[i] = i === position ? 0xFFFFFF : 0x000000
        }
    }

    return module
})()
