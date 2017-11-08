const ExchangeConnector = require('./exchangeConnector')
const { volumeString, amountPriceString } = require('./valueFormatter')

const mBTC = 10000

const BuyStrategy = (logger, config, openOrdersWatch) => {
  const exchangeConnector = ExchangeConnector(config)
  const volumeLimit = config.buying.volumeLimitPence
  const lowerLimit = config.buying.lowerLimitPence

  const checkAccounts = accounts => new Promise(resolve => {
    if (accounts.availableVolume > volumeLimit) {
      throw new Error('available volume higher than allowed: ' +
        `${volumeString(accounts.availableVolume)} > ${volumeString(volumeLimit)}`)
    }
    resolve()
  })

  const buyOrders = (trends, latestPrice, accounts) => () => {
    if (trends.isPriceSurging && accounts.availableVolume > lowerLimit) {
      const amount = Math.floor(accounts.availableVolume / latestPrice * mBTC)
      logger.log(amountPriceString(' buy order', amount, latestPrice))

      return exchangeConnector.buyLimitOrder(amount, latestPrice)
        .then(orderResponse => openOrdersWatch.addOpenOrder(orderResponse))
    }
  }

  const sellOrders = (trends, latestPrice, accounts) => () => {
    const sellAmount = accounts.availableAmount
    if (trends.isUnderSellRatio && sellAmount > 0) {
      logger.log(amountPriceString('sell order', sellAmount, latestPrice))
      return exchangeConnector.sellLimitOrder(sellAmount, latestPrice)
        .then(orderResponse => openOrdersWatch.addOpenOrder(orderResponse))
    }
  }
  return {
    issueOrders: (trends, latestPrice, accounts) =>
      checkAccounts(accounts)
        .then(buyOrders(trends, latestPrice, accounts))
        .then(sellOrders(trends, latestPrice, accounts))
  }
}

module.exports = BuyStrategy
