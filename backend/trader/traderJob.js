const {
  amountString,
  volumeString,
  OrderLogger
 } = require('../utils/ordersHelper')

const { TantalusLogger } = require('../utils/tantalusLogger')

const SurgeDetector = require('./surgeDetector')
const OpenOrdersWatch = require('./openOrdersWatch')
const OrderIssuer = require('./orderIssuer')

const TraderJob = (baseLogger, config, exchangeConnector) => {
  const logger = OrderLogger(TantalusLogger(baseLogger, config.clientId))

  const surgeDetector = SurgeDetector(logger, config, exchangeConnector)
  const openOrdersWatch = OpenOrdersWatch(logger, config, exchangeConnector)
  const orderIssuer = OrderIssuer(logger, config, openOrdersWatch, exchangeConnector)

  const tick = unixNow => Promise.all([
    surgeDetector.analyseTrends(unixNow),
    openOrdersWatch.resolveOpenOrders(),
    logger.aliveMessage()
  ]).then(orderIssuer.issueOrders)

  const logBalance = () => exchangeConnector.getAccount()
    .then(account => {
      const amount = account.balances.xbt_available
      const volume = account.balances.gbp_available
      logger.info(`Balance: ${volumeString(volume)} - ${amountString(amount)}`)
    })

  const stop = () => {
    logger.info('quit')
  }

  return { tick, stop, logBalance }
}

module.exports = TraderJob
