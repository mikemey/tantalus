const ExchangeConnector = require('./exchangeConnector')

const mBTC = 10000

const BuyStrategy = (logger, config) => {
  const exchangeConnector = ExchangeConnector(config)
  const volumeLimit = config.buying.volumeLimitPence
  const lowerLimit = config.buying.lowerLimitPence

  const data = {
    buyOrders: [],
    availableVolume: volumeLimit
  }

  const logPrices = (prefix, amount, price) => {
    logger.log(`${prefix}: Ƀ ${(amount / 10000).toFixed(4)} - £/Ƀ ${(price / 100).toFixed(2)}`)
  }

  const analyseOpenOrders = cxOpenOrders => {
    const cxOpenOrderMap = new Map(cxOpenOrders.map(order => [order.id, order]))
    const { stillOpen, bought } = data.buyOrders.reduce((cum, buyOrder) => {
      const cxOrder = cxOpenOrderMap.get(buyOrder.id)
      if (cxOrder !== undefined) {
        if (cxOrder.amount < buyOrder.amount) {
          buyOrder.amount -= cxOrder.amount
          cum.bought.push(buyOrder)
        }
        cum.stillOpen.push(cxOrder)
      } else {
        cum.bought.push(buyOrder)
      }
      return cum
    }, { stillOpen: [], bought: [] })

    const cancellations = stillOpen
      .map(openOrder => exchangeConnector
        .cancelOrder(openOrder.id)
        .then(cancelSuccess => {
          if (!cancelSuccess) {
            bought.push(openOrder)
          }
        })
      )

    return Promise.all(cancellations)
      .then(() => {
        data.buyOrders = []
        const boughtAmount = bought.reduce((sum, order) => sum + order.amount, 0)
        const boughtVolume = bought.reduce((sum, order) => {
          logPrices('   BOUGHT', order.amount, order.price)
          return sum + (order.amount * order.price / mBTC)
        }, 0)
        return { boughtAmount, boughtVolume }
      })
  }

  const buyingStep = (trends, price, volumeSold) => ({ boughtAmount, boughtVolume }) => {
    data.availableVolume -= boughtVolume
    data.availableVolume = Math.min(data.availableVolume + volumeSold, volumeLimit)

    return priceSurgeAction(trends, price)
      .then(() => boughtAmount)
  }

  const priceSurgeAction = (trends, price) => {
    if (trends.isPriceSurging) {
      logger.log('PRICE SURGE')

      if (data.availableVolume > lowerLimit) {
        const buyAmount = Math.floor(data.availableVolume / price * mBTC)

        logPrices('buy order', buyAmount, price)
        return exchangeConnector.buyLimitOrder(buyAmount, price)
          .then(orderResponse => data.buyOrders.push(orderResponse))
      }
    }
    return Promise.resolve()
  }

  return {
    getAmountBought: (trends, cxOpenOrders, price, volumeSold) => {
      return analyseOpenOrders(cxOpenOrders)
        .then(buyingStep(trends, price, volumeSold))
    }
  }
}

module.exports = BuyStrategy
