const schedule = require('node-schedule')
const moment = require('moment')

const { TantalusLogger } = require('../utils/tantalusLogger')
const { tickSchedule, traderConfigs } = require('./config')
const TraderJob = require('./traderJob')
const ExchangeConnector = require('./exchangeConnector')

const baseLogger = console
const mainLogger = TantalusLogger(baseLogger, 'MAIN')

const createTraderJobs = () => {
  mainLogger.info('setting up traders...')
  const traders = traderConfigs
    .map(config => {
      const exchangeConnector = ExchangeConnector(config)
      return TraderJob(baseLogger, config, exchangeConnector)
    })

  mainLogger.info('traders configured')
  traders.forEach(trader => trader.logBalance().catch(errorHandler))
  return traders
}

const shutdown = () => {
  if (job) job.cancel()
  stopTraderJobs()
  process.exit(0)
  mainLogger.info('quit')
}

const stopTraderJobs = () => {
  if (traderJobs) {
    mainLogger.info('stopping traders...')
    traderJobs.forEach(trader => trader.stop())
    mainLogger.info('traders stopped')
  }
}

const errorHandler = (prefix, stop) => err => {
  mainLogger.error(prefix + err.message)
  mainLogger.log(err)
  if (err.cause !== undefined) errorHandler('<=== CAUSED BY: ', false)(err.cause)
  if (stop) shutdown()
}

// SETUP ===================================
process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
process.on('uncaughtException', errorHandler('uncaught exception: ', true))

const traderJobs = createTraderJobs()

const runTraderTicks = () => Promise.all(
  traderJobs.map(trader => trader.tick(moment.utc().unix()))
).catch(errorHandler('Run ticks: ', true))

const job = schedule.scheduleJob(tickSchedule, runTraderTicks)
