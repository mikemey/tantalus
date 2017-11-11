const schedule = require('node-schedule')

const { createOrderLogger, createClientLogger } = require('../utils/ordersHelper')

const createTrader = (baseLogger, config) => {
  const clientLogger = createClientLogger(baseLogger, config.clientId)
  const traderLogger = createOrderLogger(clientLogger)

  const exchangeConnector = require('./exchangeConnector')(config)
  const surgeDetector = require('./surgeDetector')(clientLogger, config, exchangeConnector)
  const openOrdersWatch = require('./openOrdersWatch')(clientLogger, config, exchangeConnector)
  const orderIssuer = require('./orderIssuer')(clientLogger, config, openOrdersWatch, exchangeConnector)

  const errorHandler = (err, issueStop = true) => {
    traderLogger.error(err.message)
    traderLogger.log(err)
    if (err.cause !== undefined) errorHandler(err.cause, false)
    if (issueStop) stop()
  }

  const tick = () => Promise.all([
    surgeDetector.analyseTrends(),
    openOrdersWatch.resolveOpenOrders(),
    traderLogger.aliveMessage()
  ]).then(orderIssuer.issueOrders)
    .catch(errorHandler)

  const job = schedule.scheduleJob(config.tickSchedule, tick)

  const stop = () => {
    traderLogger.info('quit')
    job.cancel()
  }

  return { stop }
}

module.exports = { createTrader }
