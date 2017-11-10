const schedule = require('node-schedule')
const moment = require('moment')

const timeStamped = message => {
  const ts = moment().format('YYYY-MM-DD HH:mm:ss')
  return `[${ts}] ${message}`
}

const logger = {
  info: message => console.log(timeStamped(message)),
  error: message => console.error(timeStamped(message))
}

logger.info('setting up trader...')

const { traderConfig } = require('./config')

const exchangeConnector = require('./exchangeConnector')(traderConfig)
const surgeDetector = require('./surgeDetector')(logger, traderConfig, exchangeConnector)
const openOrdersWatch = require('./openOrdersWatch')(logger, traderConfig, exchangeConnector)
const orderIssuer = require('./orderIssuer')(logger, traderConfig, openOrdersWatch, exchangeConnector)

const errorHandler = err => {
  logger.error(err.message)
  logger.error(err.stack)
  job.cancel()
}

const tick = () => Promise.all([
  surgeDetector.analyseTrends(),
  openOrdersWatch.resolveOpenOrders()
]).then(orderIssuer.issueOrders)
  .catch(errorHandler)

const job = schedule.scheduleJob(traderConfig.tickSchedule, tick)

logger.info('trader running')
