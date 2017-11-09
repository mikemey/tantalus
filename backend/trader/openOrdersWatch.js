const {
  amountString,
  volumeString,
  amountPriceString,
  floorVolume
 } = require('../utils/valuesHelper')

const BOUGHT = '************************** BOUGHT'
const SOLD = '**************************** SOLD'

const OpenOrdersWatch = (logger, config, exchangeConnector) => {
  const volumeLimit = config.buying.volumeLimitPence
  const lowerLimit = config.buying.lowerLimitPence

  const accounts = {
    availableVolume: volumeLimit,
    availableAmount: 0
  }

  const localOpenOrders = new Map()

  const availableAmountString = () => amountString(accounts.availableAmount)
  const availableVolumeString = () => volumeString(accounts.availableVolume)

  const addOpenOrder = newLocalOrder => {
    newLocalOrder.volume = floorVolume(newLocalOrder.amount, newLocalOrder.price)

    checkLocalOrder(newLocalOrder)
    localOpenOrders.set(newLocalOrder.id, newLocalOrder)

    if (isBuyOrder(newLocalOrder)) accounts.availableVolume -= newLocalOrder.volume
    if (isSellOrder(newLocalOrder)) accounts.availableAmount -= newLocalOrder.amount
  }

  const checkLocalOrder = newLocalOrder => {
    if (isBuyOrder(newLocalOrder)) {
      if (newLocalOrder.volume > accounts.availableVolume) {
        throw new Error(`buying with more volume than available: ${volumeString(newLocalOrder.volume)} > ${availableVolumeString()}`)
      }
    } else if (isSellOrder(newLocalOrder)) {
      if (newLocalOrder.amount > accounts.availableAmount) {
        throw new Error(`selling more btcs than available: ${amountString(newLocalOrder.amount)} > ${availableAmountString()}`)
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

  const resolveOpenOrders = () => {
    return exchangeConnector.getOpenOrders()
      .then(checkExchangeOrders)
      .then(exchangeOrders => Promise.all(exchangeOrders.map(exchangeOrder =>
        exchangeConnector.cancelOrder(exchangeOrder.id)
          .then(cancelSuccess => {
            const localOrder = localOpenOrders.get(exchangeOrder.id)
            if (cancelSuccess) {
              localOpenOrders.delete(exchangeOrder.id)
              const amountExchanged = localOrder.amount - exchangeOrder.amount
              if (isBuyOrder(exchangeOrder)) {
                logger.info(amountPriceString(BOUGHT, amountExchanged, localOrder.price))
                accounts.availableAmount += amountExchanged
                accounts.availableVolume += floorVolume(exchangeOrder.amount, exchangeOrder.price)
              }
              if (isSellOrder(exchangeOrder)) {
                logger.info(amountPriceString(SOLD, amountExchanged, localOrder.price))
                accounts.availableAmount += exchangeOrder.amount
                accounts.availableVolume += floorVolume(localOrder.amount - exchangeOrder.amount, localOrder.price)
              }
            }
          })
      )))
      .then(() => {
        localOpenOrders.forEach(localOrder => {
          if (isBuyOrder(localOrder)) {
            logger.info(amountPriceString(BOUGHT, localOrder.amount, localOrder.price))
            accounts.availableAmount += localOrder.amount
          }
          if (isSellOrder(localOrder)) {
            logger.info(amountPriceString(SOLD, localOrder.amount, localOrder.price))
            accounts.availableVolume += localOrder.volume
          }
        })
        localOpenOrders.clear()
      })
      .then(() => {
        const availableAmount = accounts.availableAmount
        const availableVolume = accounts.availableVolume < lowerLimit
          ? 0
          : Math.min(accounts.availableVolume, volumeLimit)

        return { availableAmount, availableVolume }
      })
  }
  return {
    addOpenOrder,
    resolveOpenOrders
  }
}

// order type: (0 - buy; 1 - sell)
const isBuyOrder = order => order.type === 0
const isSellOrder = order => order.type === 1

module.exports = OpenOrdersWatch
