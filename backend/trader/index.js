const { TantalusLogger } = require('../utils/tantalusLogger')
const { getTraderConfigs } = require('./config')
const { Trader } = require('./trader')

const baseLogger = console
const mainLogger = TantalusLogger(baseLogger, 'MAIN')

mainLogger.info('setting up traders...')

let traderJobs = []

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
  mainLogger.error(err.message)
  mainLogger.log(err)
  stopTraderJobs()
})

traderJobs = getTraderConfigs()
  .map(config => Trader(baseLogger, config))

mainLogger.info('traders running')
