let fs = require('fs')
let arr = []

for (let i = 0; i < 9000; i++) {
    let a = Array.from({ length: 200 }, () => Math.floor(Math.random() * 16777215));
    arr.push(a)
}
fs.writeFile('recordings/test/test-recording.json', JSON.stringify({ data: arr }), e => {
    if (!e) console.log('done')
})