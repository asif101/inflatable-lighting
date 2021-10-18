const fs = require('fs')
const path = require('path')

exports.getRecordingFileNames = function () {
    const files = fs.readdirSync('./recordings')
    return files
}

exports.saveRecording = function (data, filename) {
    return new Promise((resolve, reject) => {
        function saveFile(increment = 0) {
            const name = `${filename || 'recording'}${increment || ""}.json`
            fs.writeFile(path.join('./recordings', name), JSON.stringify(data), { encoding: 'utf8', flag: 'wx' }, async ex => {
                if (ex && ex.code === "EEXIST") saveFile(increment += 1)
                else if (ex) throw ex
                else resolve(name)
            })
        }
        saveFile()
    })
}

exports.loadRecording = function (filename) {
    return new Promise((resolve, reject) => {
        fs.readFile(path.join('./recordings', filename), 'utf8', (e, jsonString) => {
            if (e) reject(e)
            else resolve(JSON.parse(jsonString))
        })
    })
}

exports.doesRecordingExist = function(filename) {
    return fs.existsSync(path.join('./recordings', filename))
}