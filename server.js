const neopixels = require('@gbkwiatt/node-rpi-ws281x-native')
const { networkInterfaces } = require('os')
const temp = require("pi-temperature")
const express = require('express')
const app = express()
const cors = require('cors')
const http = require('http')
const server = http.createServer(app)
const { Server } = require("socket.io")
const ip = networkInterfaces().wlan0.filter(x => x.family === 'IPv4')[0].address
const nodeEnv = process.argv[2] || 'development'
const port = nodeEnv === 'production' ? 3000 : 3001
const io = new Server(server, { cors: { origin: `http://${ip}:3000` } })
const { consoleColors, stripTypes } = require('./utils/enums')
const { hexStringToInt } = require('./utils/colors')
const { patterns } = require('./utils/patterns')
const { getRecordingFileNames, saveRecording, loadRecording } = require('./utils/playback')

//server initialization
app.use(cors())
app.set('port', port)
app.use(express.static('build'))
app.get('/', (req, res) => res.sendFile(__dirname + '/index.html'))
server.listen(port, () => console.log(`Server listening on port ${port}`))

//LED initialization
let numLeds = 300
let brightness = 20
let stripType = stripTypes['24V 0.2W RGB']
let channel = neopixels(numLeds, { stripType, brightness })
let colorArray = channel.array
let currentSolidColor = null
let currentPatternInterval = null
let currentPatternName = Object.keys(patterns)[1] //colorWipe
let deltaTime = 1000 / 30

//recording/playback variables
let recordBuffer = []
let isRecording = false
let recordingFileName = null
let currentPlaybackInterval = null
let currentPlaybackIndex = 0

// switchToPattern(currentPatternName)

//send temperature data
setInterval(() => {
    temp.measure((e, temp) => {
        if (e) console.warn(e)
        else {
            // console.log(temp)
            io.to('reactRoom').emit('temp', temp)
        }
    })
}, 5000)

//socket handlers
io.on('connection', socket => {

    socket.on('getData', (data, callback) => callback({ brightness, currentPatternName, currentSolidColor, patternNames: Object.keys(patterns), stripType, stripTypes, numLeds, recordingFileNames: getRecordingFileNames() }))
    socket.on('setBrightness', b => setBrightness(b))
    socket.on('setStripType', t => setStripType(t))
    socket.on('setSolidColor', hexString => setSolidColor(hexString))
    socket.on('setPattern', patternName => switchToPattern(patternName))
    socket.on('setPixels', intArray => setPixelsData(intArray))
    socket.on('setNumLeds', leds => setNumLeds(leds))
    socket.on('setRecordingMetadata', data => setRecordingMetadata(data))
    socket.on('playRecording', fileName => playbackRecording(fileName))
    socket.on('joinReactRoom', (data, callback) => {
        socket.join('reactRoom')
        console.log(consoleColors.cyan, 'Connected to React App!')
        socket.on('disconnect', () => console.log('Disconnected from React app'))
        callback(true)
    })
    socket.on('joinUnityRoom', (data, callback) => {
        socket.join('unityRoom')
        console.log(consoleColors.cyan, 'Connected to Unity App!')
        socket.on('disconnect', () => {
            console.log('Disconnected from Unity app')
            if (isRecording) { //unity app disconnected while recording
                isRecording = false
                recordingFileName = null
                recordBuffer = []
            }

        })
        callback(true)
    })
})

// ---- trap the SIGINT and reset before exit
process.on('SIGINT', function () {
    neopixels.reset()
    process.nextTick(function () { process.exit(0); })
});


//-------in scope helper functions 
//expects hexstring (eg. '#ff0000')
function setSolidColor(hexString, shouldClearPattern = true) {
    if (shouldClearPattern) clearPattern()
    cancelPlayback()
    const colorHex = hexStringToInt(hexString)
    for (let i = 0; i < channel.count; i++) {
        colorArray[i] = colorHex;
    }
    currentSolidColor = hexString
    neopixels.render()
}

function clearSolidColor() {
    setSolidColor('#000000')
}

function switchToPattern(patternName) {
    cancelPlayback()
    clearSolidColor()
    clearPattern()
    if (patterns?.[patternName]) {
        const pattern = patterns[patternName]
        currentPatternName = patternName
        pattern.reset()
        currentPatternInterval = setInterval(() => {
            pattern.next(colorArray)
            neopixels.render()
        }, deltaTime)
    }
}

function clearPattern() {
    currentPatternName = 'none'
    clearInterval(currentPatternInterval)
}

//expects intArray (eg. [1325653, 2321356 ...]), where int is a representation of hex
function setPixelsData(inputArr) {
    if (currentPatternInterval) clearPattern()
    if (currentPlaybackInterval) cancelPlayback()
    if (isRecording) recordBuffer.push(inputArr)
    for (let i = 0; i < colorArray.length; i++) {
        colorArray[i] = inputArr[i % inputArr.length]
    }
    neopixels.render()
}

function setBrightness(b) {
    brightness = b
    channel.brightness = b
    neopixels.render()
}

function setStripType(type) {
    stripType = type
    channel = neopixels(numLeds, { stripType, brightness })
    colorArray = channel.array
}

function setNumLeds(num) {
    numLeds = num
    channel = neopixels(numLeds, { stripType, brightness })
    colorArray = channel.array
}

function setRecordingMetadata({ recording, fileName }) {
    if (recording) { //start recording
        recordBuffer = [] //reset recording buffer
        isRecording = true
        console.log('started recording')
        if (fileName) recordingFileName = fileName
    }
    else { //recording is over
        isRecording = false
        if (recordBuffer.length > 0) {
            saveRecording(recordBuffer, recordingFileName).then(name => {
                console.log(`saved new recording: ${name}`)
                io.to('reactRoom').emit('recordings', getRecordingFileNames())
            })
        }
    }
}

playbackRecording('testRecording3.json')

function playbackRecording(fileName) {
    cancelPlayback()
    loadRecording(fileName).then(data => {
        const recordingArray = data
        if (currentPatternInterval) clearPattern()

        currentPlaybackIndex = 0
        currentPlaybackInterval = setInterval(() => {
            if (currentPlaybackIndex >= recordingArray.length) currentPlaybackIndex = 0
            for (let i = 0; i < colorArray.length; i++) {
                colorArray[i] = recordingArray[currentPlaybackIndex][i % recordingArray[currentPlaybackIndex].length]
            }
            neopixels.render()
            currentPlaybackIndex++

        }, deltaTime)

    }).catch(e => console.warn(e))
}

function cancelPlayback() {
    currentPlaybackIndex = 0
    clearInterval(currentPlaybackInterval)
}