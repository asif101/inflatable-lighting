

exports.rgb2Int = function (r, g, b) {
    return ((r & 0xff) << 16) + ((g & 0xff) << 8) + (b & 0xff);
}

exports.hexStringToInt = function (str) {
    return parseInt(str.replace(/^#/, ''), 16)
}