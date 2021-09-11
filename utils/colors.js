exports.hexStringToInt = function (str) {
    return parseInt(str.replace(/^#/, ''), 16)
}