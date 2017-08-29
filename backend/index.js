const createServer = require('./app')

const createLogger = () => {
  return console
}

const log = createLogger(module)
process.on('SIGINT', () => {
  log.error('SIGINT received, shutting down app')
  process.exit(1)
})

createServer(log)
  .then(() => {
    log.info('Service is up')
  })
  .catch(err => {
    log.error('Startup error', err)
  })
