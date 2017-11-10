const schedule = require('node-schedule')

const { createOrderLogger, createClientLogger } = require('../utils/ordersHelper')
const { traderConfigs } = require('./config')

const baseLogger = console
const mainLogger = createOrderLogger(baseLogger, 'MAIN')

mainLogger.info('setting up traders...')

const createTrader = cfg => {
  const clientLogger = createClientLogger(baseLogger, cfg.clientId)
  const traderLogger = createOrderLogger(clientLogger)

  const exchangeConnector = require('./exchangeConnector')(cfg)
  const surgeDetector = require('./surgeDetector')(clientLogger, cfg, exchangeConnector)
  const openOrdersWatch = require('./openOrdersWatch')(clientLogger, cfg, exchangeConnector)
  const orderIssuer = require('./orderIssuer')(clientLogger, cfg, openOrdersWatch, exchangeConnector)

  const errorHandler = err => {
    traderLogger.error(err.message)
    traderLogger.error('QUIT')
    job.cancel()
  }

  const tick = () => Promise.all([
    surgeDetector.analyseTrends(),
    openOrdersWatch.resolveOpenOrders(),
    traderLogger.aliveMessage()
  ]).then(orderIssuer.issueOrders)
    .catch(errorHandler)

  const job = schedule.scheduleJob(cfg.tickSchedule, tick)
}

traderConfigs.forEach(createTrader)

mainLogger.info('traders running')
