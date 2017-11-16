const {
  isBuyOrder,
  isSellOrder
 } = require('../utils/ordersHelper')

const OpenOrdersWatch = (orderLogger, config, exchangeConnector) => {
  const localOpenOrders = new Map()

  const addOpenOrder = newLocalOrder => {
    checkOrderType(newLocalOrder)
    localOpenOrders.set(newLocalOrder.id, newLocalOrder)
    orderLogger.logNewOrder(newLocalOrder)
  }

  const checkOrderType = (newOrder, origin = 'local') => {
    if (!isBuyOrder(newOrder) && !isSellOrder(newOrder)) {
      throw new Error(`unknown ${origin} order type: ${newOrder.type}`)
    }
  }

  const checkExchangeOrders = exchangeOrders => {
    exchangeOrders.forEach(order => checkOrderType(order, 'exchange'))
    return exchangeOrders
  }

  const cancelUnresolvedOrder = exchangeOrders => Promise.all(exchangeOrders.map(exchangeOrder =>
    exchangeConnector.cancelOrder(exchangeOrder.id)
      .then(cancelSuccess => {
        if (cancelSuccess) {
          orderLogger.logCancelledOrder(exchangeOrder)
          const localOrder = localOpenOrders.get(exchangeOrder.id)
          if (localOrder) {
            localOpenOrders.delete(exchangeOrder.id)
            logPartiallyBoughtSoldOrder(localOrder, exchangeOrder)
          }
        }
      })
  ))

  const logPartiallyBoughtSoldOrder = (localOrder, exchangeOrder) => {
    const amountDiff = localOrder.amount - exchangeOrder.amount
    const logFunc = isBuyOrder(exchangeOrder)
      ? orderLogger.logOrderBought
      : orderLogger.logOrderSold
    if (amountDiff > 0) logFunc(localOrder.id, amountDiff, localOrder.price)
  }

  const logFullyBoughtSoldOrder = () => {
    localOpenOrders.forEach(localOrder => {
      if (isBuyOrder(localOrder) && localOrder.amount > 0) {
        orderLogger.logOrderBought(localOrder.id, localOrder.amount, localOrder.price)
      }
      if (isSellOrder(localOrder) && localOrder.amount > 0) {
        orderLogger.logOrderSold(localOrder.id, localOrder.amount, localOrder.price)
      }
    })
    localOpenOrders.clear()
  }

  const resolveOpenOrders = () => exchangeConnector.getOpenOrders()
    .then(checkExchangeOrders)
    .then(cancelUnresolvedOrder)
    .then(logFullyBoughtSoldOrder)

  return {
    addOpenOrder,
    resolveOpenOrders
  }
}

module.exports = OpenOrdersWatch
