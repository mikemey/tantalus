const createServer = require('./app')
const config = require('../utils/tantalusConfig').config

const { TantalusLogger, highlightText } = require('../utils/tantalusLogger')
const WinstonAdapter = require('./utils/winstonAdapter')

const winstonAdapter = WinstonAdapter(config.logfile)
const tantalusLogger = TantalusLogger(winstonAdapter, 'SERVER', highlightText)

const serverLog = msg => tantalusLogger.info(highlightText(`========== ${msg.padEnd(5)} ==========`))

const shutdown = () => {
  serverLog('STOP')
  process.exit(0)
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)

serverLog('START')
createServer(config, tantalusLogger)
  .then(() => serverLog('UP'))
  .catch(err => {
    serverLog('ERROR')
    tantalusLogger.error(err)
  })
