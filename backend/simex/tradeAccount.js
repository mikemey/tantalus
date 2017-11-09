const moment = require('moment')

const TradeAccount = clientId => {
  const account = {
    clientId,
    startDate: moment.utc(),
    requestCount: 0
  }

  const data = {
    latestOrderId: clientId * 100000,
    openOrders: []
  }

  const newOpenOrder = (type, amount, price) => {
    const newOrder = {
      id: data.latestOrderId++,
      datetime: moment.utc().unix(),
      type,
      price,
      amount
    }
    data.openOrders.push(newOrder)
    return newOrder
  }

  const getAccount = () => account
  const increaseRequestCount = () => { account.requestCount += 1 }

  // order type: (0 - buy; 1 - sell)
  const newBuyOrder = (amount, price) => newOpenOrder(0, amount, price)
  const newSellOrder = (amount, price) => newOpenOrder(1, amount, price)

  const getOpenOrders = () => data.openOrders

  const cancelOrder = removeId => {
    let found = false
    data.openOrders = data.openOrders.filter(order => {
      if (order.id !== removeId) {
        return true
      }
      found = true
      return false
    })
    return found
  }
  return {
    getAccount,
    increaseRequestCount,
    newBuyOrder,
    newSellOrder,
    getOpenOrders,
    cancelOrder
  }
}

module.exports = TradeAccount
