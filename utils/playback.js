const fs = require('fs')

exports.getRecordingFileNames = function () {
    const files = fs.readdirSync('./recordings')
    return files
}

// exports.playRecording = function (fileName) {

// }