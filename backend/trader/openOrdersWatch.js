const ExchangeConnector = require('./exchangeConnector')

const mBTC = 10000

const OpenOrdersWatch = (logger, config) => {
  const exchangeConnector = ExchangeConnector(config)
  const volumeLimit = config.buying.volumeLimitPence
  const lowerLimit = config.buying.lowerLimitPence

  const accounts = {
    availableVolume: volumeLimit,
    availableAmount: 0
  }

  const localOpenOrders = new Map()

  const availableAmountString = () => amountString(accounts.availableAmount)
  const availableVolumeString = () => volumeString(accounts.availableVolume)

  const addOpenOrder = localOrder => {
    localOrder.volume = floorVolume(localOrder.amount, localOrder.price)

    checkLocalOrder(localOrder)
    localOpenOrders.set(localOrder.id, localOrder)

    if (isBuyOrder(localOrder)) accounts.availableVolume -= localOrder.volume
    if (isSellOrder(localOrder)) accounts.availableAmount -= localOrder.amount
  }

  const checkLocalOrder = localOrder => {
    if (isBuyOrder(localOrder)) {
      if (localOrder.volume > accounts.availableVolume) {
        throw new Error(`buying with more volume than available: ${volumeString(localOrder.volume)} > ${availableVolumeString()}`)
      }
    } else if (isSellOrder(localOrder)) {
      if (localOrder.amount > accounts.availableAmount) {
        throw new Error(`selling more btcs than available: ${amountString(localOrder.amount)} > ${availableAmountString()}`)
      }
    } else {
      throw new Error(`unknown local order type: ${localOrder.type}`)
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
              if (isBuyOrder(exchangeOrder)) {
                accounts.availableAmount += localOrder.amount - exchangeOrder.amount
                accounts.availableVolume += floorVolume(exchangeOrder.amount, exchangeOrder.price)
              }
              if (isSellOrder(exchangeOrder)) {
                accounts.availableAmount += exchangeOrder.amount
                accounts.availableVolume += floorVolume(localOrder.amount - exchangeOrder.amount, localOrder.price)
              }
            }
          })
      )))
      .then(() => {
        localOpenOrders.forEach(localOrder => {
          if (isBuyOrder(localOrder)) accounts.availableAmount += localOrder.amount
          if (isSellOrder(localOrder)) accounts.availableVolume += localOrder.volume
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

const amountString = amount => `Ƀ ${(amount / mBTC).toFixed(4)}`
const volumeString = volume => `£ ${(volume / 100).toFixed(2)}`

// order type: (0 - buy; 1 - sell)
const isBuyOrder = order => order.type === 0
const isSellOrder = order => order.type === 1

const floorVolume = (amount, price) => Math.floor(amount * price / mBTC)

module.exports = OpenOrdersWatch
