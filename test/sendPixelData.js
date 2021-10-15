const io = require('socket.io-client')
const socket = io('http://192.168.4.1:3001')

// let inputArr = [0xFF0000, 0x00FF00, 0x0000FF]
let inputArr = Array(300).fill(0x000000)
inputArr[0] = 0xFFFFFF

socket.on('connect', () => {
    console.log('connected')
    socket.emit('setRecordingMetadata', { recording: true, fileName: 'testRecoding' })
    setInterval(() => {
        inputArr.push(inputArr.shift())
        socket.emit('setPixels', inputArr)
    }, 1000 / 30)
    setTimeout(() => {
        console.log('done')
        socket.emit('setRecordingMetadata', { recording: false })
    }, 5000)
})