const createServer = require('./app')
const config = require('./config').config
const log = console

process.on('SIGINT', () => {
  log.error('SIGINT received, shutting down app')
  process.exit(1)
})

log.info('--- server config')
log.info(JSON.stringify(config, null, ' '))
log.info('--- server config')
createServer(config, log)
  .then(() => {
    log.info('Service is up')
  })
  .catch(err => {
    log.error('Startup error', err)
  })
