const schedule = require('node-schedule')
const moment = require('moment')

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

  let lastAlive = moment.utc(0)
  const logAlive = () => {
    const now = moment.utc()
    if (now.diff(lastAlive, 'minutes') > 2) {
      traderLogger.info('alive')
      lastAlive = now
    }
  }

  const tick = () => Promise.all([
    surgeDetector.analyseTrends(),
    openOrdersWatch.resolveOpenOrders(),
    logAlive()
  ]).then(orderIssuer.issueOrders)
    .catch(errorHandler)

  const job = schedule.scheduleJob(cfg.tickSchedule, tick)
}

traderConfigs.forEach(createTrader)

mainLogger.info('traders running')
