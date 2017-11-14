const createServer = require('./app')
const config = require('./config').config

const { TantalusLogger, highlightText } = require('./utils/tantalusLogger')

const tantalusLogger = TantalusLogger(console, 'SERVER', highlightText)

const serverLog = msg => tantalusLogger.info(highlightText(`========== ${msg.padEnd(5)} ==========`))

process.on('SIGTERM', () => {
  serverLog('STOP')
  process.exit(0)
})

serverLog('START')
createServer(config, tantalusLogger)
  .then(() => serverLog('UP'))
  .catch(err => {
    serverLog('ERROR')
    tantalusLogger.error(err)
  })
