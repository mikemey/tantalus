const fs = require('fs')

const config = JSON.parse(fs.readFileSync('tantalus.config.json', 'utf8'))

module.exports = { config }
