//util functions to enable resurrect function. This allows the controller to continue playing the last known playMode and file in the event it is powered off

const fs = require('fs')

exports.saveState = function (playMode, data) {
    fs.writeFile('./resurrect.json', JSON.stringify({ playMode, data }), e => {
        if (e) console.warn(e)
    })
}

exports.loadState = function() {
    return new Promise((resolve, reject) => {
        fs.readFile('./resurrect.json', 'utf8', (e, jsonString) => {
            if (e) reject(e)
            else resolve(JSON.parse(jsonString))
        })
    })
}