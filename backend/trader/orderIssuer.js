const { floorAmount } = require('../utils/ordersHelper')

const checkConfig = config => {
  if (!config.buying || !config.buying.volumeLimitPence) throw Error('Buy volume limit parameter missing!')
  if (!config.buying || !config.buying.lowerLimitPence) throw Error('Buy volume lower limit parameter missing!')
  if (!config.selling || !config.selling.lowerLimit_mmBtc) throw Error('Sell volume lower limit parameter missing!')
}

const OrderIssuer = (orderLogger, config, openOrdersWatch, exchangeConnector) => {
  checkConfig(config)
  const amountLowerLimit = config.selling.lowerLimit_mmBtc
  const volumeUpperLimit = config.buying.volumeLimitPence
  const volumeLowerLimit = config.buying.lowerLimitPence

  const issueBuyOrder = (trends, account) => {
    if (trends.isPriceSurging) {
      const buyingPrice = trends.latestPrice
      const buyVolume = Math.min(account.balances.gbp_available, volumeUpperLimit)
      if (buyVolume > volumeLowerLimit) {
        const amount = floorAmount(buyVolume, buyingPrice)
        return exchangeConnector.buyLimitOrder(amount, buyingPrice)
          .then(sendOrderToWatch)
          .catch(exchangeErrors('buy'))
      }
    }
  }

  const issueSellOrder = (trends, account) => {
    if (trends.isUnderSellRatio) {
      const sellingPrice = trends.latestPrice
      const sellAmount = account.balances.xbt_available
      if (sellAmount > amountLowerLimit) {
        return exchangeConnector.sellLimitOrder(sellAmount, sellingPrice)
          .then(sendOrderToWatch)
          .catch(exchangeErrors('sell'))
      }
    }
  }

  const exchangeErrors = type => err => {
    if (err.statusCode === 409) {
      orderLogger.info(`${type} order failed`)
      orderLogger.log(err.body)
      return
    }
    throw err
  }

  const sendOrderToWatch = orderResponse => openOrdersWatch.addOpenOrder(orderResponse)
  return {
    issueOrders: ([trends]) =>
      trends.latestPrice && (trends.isPriceSurging || trends.isUnderSellRatio)
        ? exchangeConnector.getAccount()
          .then(account => Promise.all([
            issueBuyOrder(trends, account),
            issueSellOrder(trends, account)
          ]))
        : Promise.resolve()
  }
}

module.exports = OrderIssuer
