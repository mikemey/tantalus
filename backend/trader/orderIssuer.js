const { volumeString, amountPriceString } = require('../utils/valuesHelper')

const mBTC = 10000

const OrderIssuer = (logger, config, openOrdersWatch, exchangeConnector) => {
  const volumeLimit = config.buying.volumeLimitPence
  const lowerLimit = config.buying.lowerLimitPence

  const checkAccounts = accounts => new Promise(resolve => {
    if (accounts.availableVolume > volumeLimit) {
      throw new Error('available volume higher than allowed: ' +
        `${volumeString(accounts.availableVolume)} > ${volumeString(volumeLimit)}`)
    }
    resolve()
  })

  const buyOrders = (trends, accounts) => () => {
    if (trends.isPriceSurging && accounts.availableVolume > lowerLimit) {
      const amount = Math.floor(accounts.availableVolume / trends.latestPrice * mBTC)
      logger.info(amountPriceString(' buy order', amount, trends.latestPrice))

      return exchangeConnector.buyLimitOrder(amount, trends.latestPrice)
        .then(orderResponse => openOrdersWatch.addOpenOrder(orderResponse))
    }
  }

  const sellOrders = (trends, accounts) => () => {
    const sellAmount = accounts.availableAmount
    if (trends.isUnderSellRatio && sellAmount > 0) {
      logger.info(amountPriceString('sell order', sellAmount, trends.latestPrice))

      return exchangeConnector.sellLimitOrder(sellAmount, trends.latestPrice)
        .then(orderResponse => openOrdersWatch.addOpenOrder(orderResponse))
    }
  }
  return {
    issueOrders: ([trends, accounts]) =>
      checkAccounts(accounts)
        .then(buyOrders(trends, accounts))
        .then(sellOrders(trends, accounts))
  }
}

module.exports = OrderIssuer
