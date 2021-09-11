const { rainbow } = require('../utils/patterns')

rainbow.init(20)

console.log(rainbow.next())
console.log(rainbow.next())
console.log(rainbow.next())

let patternInterval = null
let deltaTime = 100//1000/60

patternInterval = setInterval(() => {
    console.log(rainbow.next())
}, deltaTime)