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
      throw Error(`unknown ${origin} order type: ${newOrder.type}`)
    }
    if (newOrder.id === undefined) throw Error(`${origin} order: ID is missing!`)
    if (!newOrder.amount) throw Error(`${origin} order: Amount is missing or zero!`)
    if (!newOrder.price) throw Error(`${origin} order: Price is missing or zero!`)
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
        } else {
          orderLogger.info(`cancelling order [${exchangeOrder.id}] unsuccessful!`)
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
  }

  const clearLocalOpenOrders = () => {
    localOpenOrders.clear()
  }

  const resolveOpenOrders = () => exchangeConnector.getOpenOrders()
    .then(checkExchangeOrders)
    .then(cancelUnresolvedOrder)
    .then(() => {
      logFullyBoughtSoldOrder()
      clearLocalOpenOrders()
    })

  // ========= synced functions:
  const syncedAddOpenOrder = newLocalOrder => {
    localOpenOrders.set(newLocalOrder.id, newLocalOrder)
  }

  const syncedResolveOpenOrders = () => {
    const openOrders = exchangeConnector.getOpenOrders()
    syncedCancelUnresolvedOrder(openOrders)
    clearLocalOpenOrders()
  }

  const syncedCancelUnresolvedOrder = exchangeOrders => exchangeOrders.map(exchangeOrder => {
    const cancelSuccess = exchangeConnector.cancelOrder(exchangeOrder.id)
    if (cancelSuccess) {
      const localOrder = localOpenOrders.get(exchangeOrder.id)
      if (localOrder) {
        localOpenOrders.delete(exchangeOrder.id)
      }
    }
  })

  return {
    addOpenOrder: config.syncedMode ? syncedAddOpenOrder : addOpenOrder,
    resolveOpenOrders: config.syncedMode ? syncedResolveOpenOrders : resolveOpenOrders
  }
}

module.exports = OpenOrdersWatch
