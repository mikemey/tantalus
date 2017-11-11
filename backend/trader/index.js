const { createOrderLogger } = require('../utils/ordersHelper')
const { getTraderConfigs } = require('./config')
const { createTrader } = require('./traderInstance')

const baseLogger = console
const mainLogger = createOrderLogger(baseLogger, 'MAIN')

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
  .map(config => createTrader(baseLogger, config))

mainLogger.info('traders running')
