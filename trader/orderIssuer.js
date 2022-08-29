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

  const issueBuyOrder = (trends, account, buyFunc = sendBuyOrder) => {
    if (trends.isPriceSurging) {
      const buyingPrice = trends.latestPrice
      const buyVolume = Math.min(account.balances.gbp_available, volumeUpperLimit)
      if (buyVolume > volumeLowerLimit) {
        const buyAmount = floorAmount(buyVolume, buyingPrice)
        return buyFunc(buyAmount, buyingPrice)
      }
    }
  }

  const sendBuyOrder = (buyAmount, buyingPrice) => exchangeConnector.buyLimitOrder(buyAmount, buyingPrice)
    .then(sendOrderToWatch)
    .catch(exchangeErrors('buy'))

  const issueSellOrder = (trends, account, sellFunc = sendSellOrder) => {
    if (trends.isUnderSellRatio) {
      const sellingPrice = trends.latestPrice
      const sellAmount = account.balances.xbt_available
      if (sellAmount > amountLowerLimit) {
        return sellFunc(sellAmount, sellingPrice)
      }
    }
  }

  const sendSellOrder = (sellAmount, sellingPrice) => exchangeConnector.sellLimitOrder(sellAmount, sellingPrice)
    .then(sendOrderToWatch)
    .catch(exchangeErrors('sell'))

  const exchangeErrors = type => err => {
    if (err.statusCode === 409) {
      orderLogger.info(`${type} order failed`)
      orderLogger.log(err.body)
      return
    }
    throw err
  }

  const issueOrders = ([trends]) =>
    trends.latestPrice && (trends.isPriceSurging || trends.isUnderSellRatio)
      ? exchangeConnector.getAccount()
        .then(account => Promise.all([
          issueBuyOrder(trends, account),
          issueSellOrder(trends, account)
        ]))
      : Promise.resolve()

  // ========= synced functions:
  const syncedIssueOrders = ([trends]) => {
    if (trends.latestPrice && (trends.isPriceSurging || trends.isUnderSellRatio)) {
      const account = exchangeConnector.getAccount()
      issueBuyOrder(trends, account, syncSendBuyOrder)
      issueSellOrder(trends, account, syncSendSellOrder)
    }
  }

  const syncSendBuyOrder = (buyAmount, buyingPrice) => {
    const buyOrder = exchangeConnector.buyLimitOrder(buyAmount, buyingPrice)
    sendOrderToWatch(buyOrder)
  }

  const syncSendSellOrder = (sellAmount, sellingPrice) => {
    const sellOrder = exchangeConnector.sellLimitOrder(sellAmount, sellingPrice)
    sendOrderToWatch(sellOrder)
  }

  const sendOrderToWatch = orderResponse => openOrdersWatch.addOpenOrder(orderResponse)

  return {
    issueOrders: config.syncedMode ? syncedIssueOrders : issueOrders
  }
}

module.exports = OrderIssuer
