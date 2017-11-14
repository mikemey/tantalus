const { TantalusLogger } = require('../utils/tantalusLogger')
const { getTraderConfigs } = require('./config')
const { Trader } = require('./traderInstance')

const baseLogger = console
const mainLogger = TantalusLogger(baseLogger, 'MAIN')

mainLogger.info('setting up traders...')

let traderJobs = []

const shutdown = () => {
  mainLogger.info('stopping traders...')
  traderJobs.forEach(trader => trader.stop())
  mainLogger.info('stopped')
}

process.on('uncaughtException', err => {
  mainLogger.error(err.message)
  mainLogger.log(err)
  shutdown()
})

process.on('SIGTERM', () => {
  shutdown()
  process.exit(0)
})

traderJobs = getTraderConfigs()
  .map(config => Trader(baseLogger, config))

mainLogger.info('traders running')
