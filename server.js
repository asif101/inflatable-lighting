const neopixels = require('@gbkwiatt/node-rpi-ws281x-native')
const { networkInterfaces } = require('os')
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
const { consoleColors } = require('./utils/enums')
const { hexStringToInt } = require('./utils/colors')
const { patterns } = require('./utils/patterns')

//server initialization
app.use(cors())
app.set('port', port)
app.use(express.static('build'))
app.get('/', (req, res) => res.sendFile(__dirname + '/index.html'))
server.listen(port, () => console.log(`Server listening on port ${port}`))

//LED initialization
const NUM_LEDS = 60
let brightness = 20
const channel = neopixels(NUM_LEDS, { stripType: 0x00081000, brightness })
const colorArray = channel.array
let currentSolidColor = null
let currentPatternInterval = null
let currentPatternName = Object.keys(patterns)[1] //colorWipe
let patternDeltaTime = 1000 / 30

switchToPattern(currentPatternName)



//socket handlers
io.on('connection', socket => {
    console.log(consoleColors.cyan, 'Connected to client!')
    socket.on('getData', (data, callback) => callback({ brightness, currentPatternName, currentSolidColor }))
    socket.on('setBrightness', b => setBrightness(b))
    socket.on('setSolidColor', hexString => setSolidColor(hexString))
    socket.on('setPattern', patternName => switchToPattern(patternName))
    socket.on('setPixels', intArray => setPixelsData(intArray))
})


// ---- trap the SIGINT and reset before exit
process.on('SIGINT', function () {
    neopixels.reset()
    process.nextTick(function () { process.exit(0); })
});


//-------in scope helper functions 
//expects hexstring (eg. '#ff0000')
function setSolidColor(hexString) {
    clearPattern()
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
    clearSolidColor()
    clearPattern()
    if (patterns?.[patternName]) {
        const pattern = patterns[patternName]
        currentPatternName = patternName
        pattern.reset()
        currentPatternInterval = setInterval(() => {
            pattern.next(colorArray)
            neopixels.render()
        }, patternDeltaTime)
    }
}

function clearPattern() {
    currentPatternName = 'none'
    clearInterval(currentPatternInterval)
}

//expects intArray (eg. [1325653, 2321356 ...]), where int is a representation of hex
function setPixelsData(inputArr) {
    if(currentPatternInterval) clearPattern()
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