const mBTC = 10000

const OrderIssuer = (baseLogger, config, openOrdersWatch, exchangeConnector) => {
  const amountLowerLimit = config.selling.lowerLimit_mBtc
  const volumeUpperLimit = config.buying.volumeLimitPence
  const volumeLowerLimit = config.buying.lowerLimitPence

  const issueBuyOrder = (trends, account) => {
    if (trends.isPriceSurging) {
      const buyingPrice = trends.latestPrice
      const buyVolume = Math.min(account.balances.gbp_available, volumeUpperLimit)
      if (buyVolume > volumeLowerLimit) {
        const amount = Math.floor(buyVolume / buyingPrice * mBTC)
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
    issueOrders: ([trends]) => trends.isPriceSurging || trends.isUnderSellRatio
      ? exchangeConnector.getAccount()
        .then(account => Promise.all([
          issueBuyOrder(trends, account),
          issueSellOrder(trends, account)
        ]))
      : Promise.resolve()
  }
}

module.exports = OrderIssuer
