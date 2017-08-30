const fs = require('fs')

const createServer = require('./app')
const startScheduler = require('./utils/scheduler')

const config = JSON.parse(fs.readFileSync('tantalus.config.json', 'utf8'))
const log = console

process.on('SIGINT', () => {
  log.error('SIGINT received, shutting down app')
  process.exit(1)
})

console.log('--- server config')
console.log(JSON.stringify(config, null, ' '))
console.log('--- server config')
createServer(config, log)
  .then(() => {
    log.info('Service is up')
    startScheduler()
    log.info('Scheduler is up')
  })
  .catch(err => {
    log.error('Startup error', err)
  })
