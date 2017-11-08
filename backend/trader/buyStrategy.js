const ExchangeConnector = require('./exchangeConnector')
const { volumeString, amountPriceString } = require('./valueFormatter')

const mBTC = 10000

const BuyStrategy = (logger, config, openOrdersWatch) => {
  const exchangeConnector = ExchangeConnector(config)
  const volumeLimit = config.buying.volumeLimitPence
  const lowerLimit = config.buying.lowerLimitPence

  const checkAccounts = accounts => new Promise((resolve) => {
    if (accounts.availableVolume > volumeLimit) {
      throw new Error('available volume higher than allowed: ' +
        `${volumeString(accounts.availableVolume)} > ${volumeString(volumeLimit)}`)
    }
    resolve()
  })

  return {
    issueOrders: (trends, latestTransactionPrice, accounts) => checkAccounts(accounts)
      .then(() => {
        if (trends.isPriceSurging) {
          if (accounts.availableVolume > lowerLimit) {
            const amount = Math.floor(accounts.availableVolume / latestTransactionPrice * mBTC)
            logger.log(amountPriceString('buy order', amount, latestTransactionPrice))

            return exchangeConnector.buyLimitOrder(amount, latestTransactionPrice)
              .then(orderResponse => openOrdersWatch.addOpenOrder(orderResponse))
          }
        }
      })
  }
}

module.exports = BuyStrategy
