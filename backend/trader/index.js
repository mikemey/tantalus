const { TantalusLogger } = require('../utils/tantalusLogger')
const { getTraderConfigs } = require('./config')
const { Trader } = require('./trader')

const baseLogger = console
const mainLogger = TantalusLogger(baseLogger, 'MAIN')

let traderJobs = []

const startTraderJobs = () => {
  mainLogger.info('setting up traders...')
  traderJobs = getTraderConfigs().map(config => Trader(baseLogger, config))
  mainLogger.info('traders running')
}

const stopTraderJobs = () => {
  mainLogger.info('stopping traders...')
  traderJobs.forEach(trader => trader.stop())
  mainLogger.info('stopped')
}

const shutdown = () => {
  stopTraderJobs()
  process.exit(0)
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
process.on('uncaughtException', err => {
  mainLogger.error(`uncaught exception: ${err.message}`)
  mainLogger.log(err)
  stopTraderJobs()
})

startTraderJobs()
