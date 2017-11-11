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

  const errorHandler = (err, issueQuit = true) => {
    traderLogger.error(err.message)
    if (err.stack !== undefined) errorHandler(err.cause, false)
    traderLogger.error('QUIT')
    if (err.cause !== undefined) errorHandler(err.cause, false)
    if (issueQuit) job.cancel()
  }

  const tick = () => Promise.all([
    surgeDetector.analyseTrends(),
    openOrdersWatch.resolveOpenOrders(),
    traderLogger.aliveMessage()
  ]).then(orderIssuer.issueOrders)
    .catch(errorHandler)

  const job = schedule.scheduleJob(cfg.tickSchedule, tick)
}

let duplicatesFound = false
traderConfigs.reduce((existing, cfg) => {
  if (existing.includes(cfg.clientId)) {
    duplicatesFound = true
    mainLogger.error(`duplicate client ID [${cfg.clientId}]`)
  }
  existing.push(cfg.clientId)
  return existing
}, [])

if (!duplicatesFound) traderConfigs.forEach(createTrader)

mainLogger.info('traders running')
