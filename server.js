const neopixels = require('@gbkwiatt/node-rpi-ws281x-native')
const { networkInterfaces } = require('os')
const express = require('express')
const app = express()
const cors = require('cors')
const http = require('http')
const server = http.createServer(app)
const ip = networkInterfaces().wlan0.filter(x => x.family === 'IPv4')[0].address
const nodeEnv = process.argv[2] || 'development'
const port = nodeEnv === 'production' ? 3000 : 3001
const io = require("socket.io")(server, { cors: { origin: `http://${ip}:3000` } })
const temp = require("pi-temperature")
const { consoleColors, stripTypes, playModes } = require('./utils/enums')
const { hexStringToInt } = require('./utils/colors')
const { patterns } = require('./utils/patterns')
const { getRecordingFileNames, saveRecording, loadRecording, doesRecordingExist } = require('./utils/playback')
const { saveState, loadState } = require('./utils/resurrect')

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
let currentPatternName = null
let deltaTime = 1000 / 30
let playMode = playModes.pattern

//recording/playback variables
let recordBuffer = []
let isRecording = false
let recordingFileName = null
let currentPlaybackInterval = null
let currentPlaybackIndex = 0

resurrectState()

//send temperature data
function getTemperature() {
    temp.measure((e, temp) => {
        if (e) console.warn(e)
        else {
            io.to('reactRoom').emit('temp', temp)
        }
    })
}
setInterval(() => {
    getTemperature()
}, 5000)

//socket handlers
io.on('connection', socket => {
    socket.on('getData', (data, callback) => callback({ brightness, currentPatternName, currentSolidColor, patternNames: Object.keys(patterns), stripType, stripTypes, numLeds, recordingFileNames: getRecordingFileNames(), playMode }))
    socket.on('setBrightness', b => setBrightness(b))
    socket.on('setStripType', t => setStripType(t))
    socket.on('setSolidColor', hexString => setSolidColor(hexString))
    socket.on('setPattern', patternName => switchToPattern(patternName))
    socket.on('setPixels', stringArray => {
        const intArray = stringArray.map(x => parseInt(x))
        setPixelsData(intArray)
        io.to('reactRoom').emit('pixelData', intArray)
    })
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
        if (callback) callback(true)
    })
})

// ---- trap the SIGINT and reset before exit
process.on('SIGINT', function () {
    neopixels.reset()
    process.nextTick(function () { process.exit(0); })
});


//-------in scope helper functions 
//expects hexstring (eg. '#ff0000')
function setSolidColor(hexString) {
    if (playMode = playModes.PATTERN) clearPattern()
    if (playMode = playModes.PLAYBACK) cancelPlayback()
    setPlayMode(playModes.SOLID)
    saveState(playModes.SOLID, hexString)
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
    setPlayMode(playModes.PATTERN)
    if (patterns?.[patternName]) {
        const pattern = patterns[patternName]
        currentPatternName = patternName
        pattern.reset()
        saveState(playModes.PATTERN, patternName)
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
    if (playMode = playModes.PATTERN) clearPattern()
    if (playMode = playModes.PLAYBACK) cancelPlayback()
    setPlayMode(playModes.LIVE)
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

function playbackRecording(fileName) {
    cancelPlayback()
    setPlayMode(playModes.PLAYBACK)
    loadRecording(fileName).then(data => {
        const recordingArray = data
        if (currentPatternInterval) clearPattern()

        saveState(playModes.PLAYBACK, fileName)
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

function setPlayMode(mode) {
    playMode = mode
    io.to('reactRoom').emit('playMode', playMode)
}

function resurrectState() {
    loadState().then(({playMode, data}) => {
        switch (playMode) {
            case playModes.SOLID:
                setSolidColor(data)
                break;
            case playModes.PATTERN:
                if(Object.keys(pattern).includes(data)) switchToPattern(data)
                else playDefault()
                break;
            case playModes.PLAYBACK:
                if(doesRecordingExist(data)) playbackRecording(data)
                else playDefault()
                break;
            default:
                playDefault()
                break;
        }
    }).catch(e => playDefault())

    function playDefault() {
        switchToPattern(Object.keys(patterns)[1]) //colorWipe
    }
}