const io = require('socket.io-client')
const socket = io('http://192.168.1.228:3001')

// let inputArr = [0xFF0000, 0x00FF00, 0x0000FF]
let inputArr = Array(60).fill(0x000000)
inputArr[0] = 0xFFFFFF

socket.on('connect', () => {
    console.log('connected')
    setInterval(() => {
        inputArr.push(inputArr.shift())
        socket.emit('setPixels', inputArr)
    }, 100)
})