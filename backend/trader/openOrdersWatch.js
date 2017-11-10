const {
  amountString,
  volumeString,
  floorVolume,
  createOrderLogger,
  isBuyOrder,
  isSellOrder
 } = require('../utils/ordersHelper')

const OpenOrdersWatch = (baseLogger, config, exchangeConnector) => {
  const orderLogger = createOrderLogger(baseLogger)
  const volumeLimit = config.buying.volumeLimitPence
  const lowerLimit = config.buying.lowerLimitPence

  const accounts = {
    availableVolume: volumeLimit,
    availableAmount: 0
  }

  const localOpenOrders = new Map()

  const addOpenOrder = newLocalOrder => {
    newLocalOrder.volume = floorVolume(newLocalOrder.amount, newLocalOrder.price)

    checkLocalOrder(newLocalOrder)
    localOpenOrders.set(newLocalOrder.id, newLocalOrder)
    orderLogger.logNewOrder(newLocalOrder)

    if (isBuyOrder(newLocalOrder)) accounts.availableVolume -= newLocalOrder.volume
    if (isSellOrder(newLocalOrder)) accounts.availableAmount -= newLocalOrder.amount
  }

  const checkLocalOrder = newLocalOrder => {
    if (isBuyOrder(newLocalOrder)) {
      if (newLocalOrder.volume > accounts.availableVolume) {
        const newVolume = volumeString(newLocalOrder.volume)
        const availableVolume = volumeString(accounts.availableVolume)
        throw new Error(`buying with more volume than available: ${newVolume} > ${availableVolume}`)
      }
    } else if (isSellOrder(newLocalOrder)) {
      if (newLocalOrder.amount > accounts.availableAmount) {
        const newAmount = amountString(newLocalOrder.amount)
        const availableAmount = amountString(accounts.availableAmount)
        throw new Error(`selling more btcs than available: ${newAmount} > ${availableAmount}`)
      }
    } else {
      throw new Error(`unknown local order type: ${newLocalOrder.type}`)
    }
  }

  const checkExchangeOrders = exchangeOrders => {
    exchangeOrders.forEach(order => {
      if (!isBuyOrder(order) && !isSellOrder(order)) {
        throw new Error(`unknown exchange order type: ${order.type}`)
      }
    })
    return exchangeOrders
  }

  const cancelUnresolvedOrder = exchangeOrders => Promise.all(exchangeOrders.map(exchangeOrder =>
    exchangeConnector.cancelOrder(exchangeOrder.id)
      .then(cancelSuccess => {
        const localOrder = localOpenOrders.get(exchangeOrder.id)
        if (cancelSuccess) {
          localOpenOrders.delete(exchangeOrder.id)

          if (isBuyOrder(exchangeOrder)) cancelBuyOrder(localOrder, exchangeOrder)
          if (isSellOrder(exchangeOrder)) cancelSellOrder(localOrder, exchangeOrder)
        }
      })
  ))

  const cancelBuyOrder = (localOrder, exchangeOrder) => {
    const amountBought = localOrder.amount - exchangeOrder.amount
    if (amountBought > 0) {
      orderLogger.logOrderBought(amountBought, localOrder.price)
      accounts.availableAmount += amountBought
    }
    accounts.availableVolume += floorVolume(exchangeOrder.amount, exchangeOrder.price)
  }

  const cancelSellOrder = (localOrder, exchangeOrder) => {
    const amountSold = localOrder.amount - exchangeOrder.amount
    if (amountSold > 0) {
      orderLogger.logOrderSold(amountSold, localOrder.price)
    }
    accounts.availableAmount += exchangeOrder.amount
    accounts.availableVolume += floorVolume(localOrder.amount - exchangeOrder.amount, localOrder.price)
  }

  const checkBoughtSoldOrder = () => {
    localOpenOrders.forEach(localOrder => {
      if (isBuyOrder(localOrder) && localOrder.amount > 0) {
        orderLogger.logOrderBought(localOrder.amount, localOrder.price)
        accounts.availableAmount += localOrder.amount
      }
      if (isSellOrder(localOrder) && localOrder.amount > 0) {
        orderLogger.logOrderSold(localOrder.amount, localOrder.price)
        accounts.availableVolume += localOrder.volume
      }
    })
    localOpenOrders.clear()
  }

  const createAvailableAccounts = () => {
    const availableAmount = accounts.availableAmount
    const availableVolume = accounts.availableVolume < lowerLimit
      ? 0
      : Math.min(accounts.availableVolume, volumeLimit)

    return { availableAmount, availableVolume }
  }

  const resolveOpenOrders = () => exchangeConnector.getOpenOrders()
    .then(checkExchangeOrders)
    .then(cancelUnresolvedOrder)
    .then(checkBoughtSoldOrder)
    .then(createAvailableAccounts)

  return {
    addOpenOrder,
    resolveOpenOrders
  }
}

module.exports = OpenOrdersWatch
