const { floorAmount } = require('../utils/ordersHelper')

const OrderIssuer = (orderLogger, config, openOrdersWatch, exchangeConnector) => {
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
          .then(orderResponse => openOrdersWatch.addOpenOrder(orderResponse))
      }
    }
  }

  const issueSellOrder = (trends, account) => {
    if (trends.isUnderSellRatio) {
      const sellingPrice = trends.latestPrice
      const sellAmount = account.balances.xbt_available
      if (sellAmount > amountLowerLimit) {
        return exchangeConnector.sellLimitOrder(sellAmount, sellingPrice)
          .then(orderResponse => openOrdersWatch.addOpenOrder(orderResponse))
      }
    }
  }

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
