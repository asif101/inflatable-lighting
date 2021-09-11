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

const NUM_LEDS = 60
app.use(cors())
app.set('port', port)
app.use(express.static('build'))
app.get('/', (req, res) => res.sendFile(__dirname + '/index.html'))
server.listen(port, () => console.log(`Server listening on port ${port}`))

const channel = neopixels(NUM_LEDS, { stripType: 0x00081000, brightness: 50 })
const colorArray = channel.array
setTimeout(() => setSolidColor(0x000000), 500)

// ---- trap the SIGINT and reset before exit
process.on('SIGINT', function () {
    neopixels.reset();
    process.nextTick(function () { process.exit(0); });
});


io.on('connection', socket => {
    console.log(consoleColors.cyan, 'Connected to client!')
    socket.on('setBrightness', brightness => {
        channel.brightness = brightness
        neopixels.render()
    })
    socket.on('setSolidColor', hexString => {
        setSolidColor(hexStringToInt(hexString))
    })
})


function setSolidColor(colorHex) {
    for (let i = 0; i < channel.count; i++) {
        colorArray[i] = colorHex;
    }
    neopixels.render();
}