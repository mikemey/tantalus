const createServer = require('./app')
const config = require('./config').config
const log = console

const msgTransform = msg => `\x1b[1m${msg}\x1b[0m`
const serverLog = msg =>
  log.info('===== %s=======', msgTransform(`SERVER ${msg.padEnd(5)} `))

process.on('SIGTERM', () => {
  serverLog('STOP')
  process.exit(0)
})

serverLog('START')
createServer(config, log)
  .then(() => serverLog('UP'))
  .catch(err => {
    serverLog('ERROR')
    log.error(err)
  })
