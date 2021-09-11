const ws281x = require('@gbkwiatt/node-rpi-ws281x-native');

const channel = ws281x(60, { stripType: 'ws2812' });

const colorArray = channel.array;
for (let i = 0; i < channel.count; i++) {
    colorArray[i] = 0xFFFFFF;
}

ws281x.render();
setInterval(() => {}, 1 << 30)

// ---- trap the SIGINT and reset before exit
process.on('SIGINT', function () {
    ws281x.reset();
    process.nextTick(function () { process.exit(0); });
});