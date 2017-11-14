const schedule = require('node-schedule')
const moment = require('moment')

const {
  amountString,
  volumeString,
  OrderLogger
 } = require('../utils/ordersHelper')

const { TantalusLogger } = require('../utils/tantalusLogger')

const ExchangeConnector = require('./exchangeConnector')
const SurgeDetector = require('./surgeDetector')
const OpenOrdersWatch = require('./openOrdersWatch')
const OrderIssuer = require('./orderIssuer')

const Trader = (baseLogger, config) => {
  const logger = OrderLogger(TantalusLogger(baseLogger, config.clientId))

  const unixTime = () => moment.utc().unix()
  const exchangeConnector = ExchangeConnector(config)

  const surgeDetector = SurgeDetector(logger, config, exchangeConnector, unixTime)
  const openOrdersWatch = OpenOrdersWatch(logger, config, exchangeConnector)
  const orderIssuer = OrderIssuer(logger, config, openOrdersWatch, exchangeConnector)

  exchangeConnector.getAccount().then(account => {
    const amount = account.balances.xbt_available
    const volume = account.balances.gbp_available
    logger.info(`Balance: ${volumeString(volume)} - ${amountString(amount)}`)
  })

  const errorHandler = (err, issueStop = true) => {
    logger.error(err.message)
    logger.log(err)
    if (err.cause !== undefined) errorHandler(err.cause, false)
    if (issueStop) stop()
  }

  const tick = () => Promise.all([
    surgeDetector.analyseTrends(),
    openOrdersWatch.resolveOpenOrders(),
    logger.aliveMessage()
  ]).then(orderIssuer.issueOrders)
    .catch(errorHandler)

  const job = schedule.scheduleJob(config.tickSchedule, tick)

  const stop = () => {
    logger.info('quit')
    job.cancel()
  }

  return { stop }
}

module.exports = { Trader }
