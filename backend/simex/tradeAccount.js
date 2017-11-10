const moment = require('moment')

const {
  createOrderLogger,
  BUY_ORDER_TYPE, SELL_ORDER_TYPE, isBuyOrder, isSellOrder,
  floorVolume, amountString, volumeString
 } = require('../utils/ordersHelper')

const START_BALANCE_PENCE = 100000

const TradeAccount = (clientId, baseLogger) => {
  const orderLogger = createOrderLogger(baseLogger, clientId)
  const b = {
    gbp_available: START_BALANCE_PENCE,
    gbp_reserved: 0,
    xbt_available: 0,
    xbt_reserved: 0
  }

  const account = {
    clientId,
    stats: {
      startDate: moment.utc(),
      requestCount: 0
    },
    balances: b
  }

  const data = {
    latestOrderId: clientId * 100000,
    openOrders: [],
    latestTransactionId: 0
  }

  const recalculateBalances = () => {
    b.gbp_balance = b.gbp_available + b.gbp_reserved
    b.xbt_balance = b.xbt_available + b.xbt_reserved
  }

  const getAccount = () => {
    recalculateBalances()
    return account
  }
  const increaseRequestCount = () => { account.stats.requestCount += 1 }

  const newOpenOrder = (type, amount, price) => {
    const newOrder = {
      id: data.latestOrderId++,
      datetime: moment.utc().unix(),
      type,
      price,
      amount
    }
    orderLogger.logNewOrder(newOrder)
    data.openOrders.push(newOrder)
    return newOrder
  }

  const newBuyOrder = (amount, price) => {
    const volume = floorVolume(amount, price)
    if (volume > b.gbp_available) {
      throw Error('buying with more volume than available: ' +
        `${volumeString(volume)} > ${volumeString(b.gbp_available)}`)
    }
    b.gbp_reserved += volume
    b.gbp_available -= volume
    return newOpenOrder(BUY_ORDER_TYPE, amount, price)
  }

  const newSellOrder = (amount, price) => {
    if (amount > b.xbt_available) {
      throw Error('selling more btcs than available: ' +
        `${amountString(amount)} > ${amountString(b.xbt_available)}`)
    }
    b.xbt_available -= amount
    b.xbt_reserved += amount
    return newOpenOrder(SELL_ORDER_TYPE, amount, price)
  }

  const getOpenOrders = () => data.openOrders

  const cancelOrder = removeId => {
    let found = false
    data.openOrders = data.openOrders.filter(order => {
      if (order.id !== removeId) {
        return true
      }
      found = true
      if (isBuyOrder(order)) {
        const volume = floorVolume(order.amount, order.price)
        b.gbp_reserved -= volume
        b.gbp_available += volume
      }
      if (isSellOrder(order)) {
        b.xbt_available += order.amount
        b.xbt_reserved -= order.amount
      }
      orderLogger.logCancelledOrder(order)
      return false
    })
    return found
  }

  const transactionsUpdate = originalTxs => {
    const transactions = originalTxs
      .filter(tx => tx.tid > data.latestTransactionId)
      .map(tx => Object.assign({}, tx))
      .sort((txa, txb) => txb.tid - txa.tid)

    if (transactions.length > 0) {
      data.latestTransactionId = transactions[0].tid
      data.openOrders = data.openOrders.reduce((stillOpen, order) => {
        transactions.forEach(matchOrderWithTransaction(order))
        if (order.amount > 0) stillOpen.push(order)
        return stillOpen
      }, [])
    }
  }

  const matchingBidPrice = (order, transaction) =>
    isBuyOrder(order) && order.price >= transaction.price

  const matchingAskPrice = (order, transaction) =>
    isSellOrder(order) && order.price <= transaction.price

  const matchOrderWithTransaction = order => transaction => {
    if (order.amount <= 0 || transaction.amount <= 0) return
    if (matchingBidPrice(order, transaction) || matchingAskPrice(order, transaction)) {
      const matchingAmount = Math.min(order.amount, transaction.amount)
      const tradingPrice = order.price
      const tradingVolume = floorVolume(matchingAmount, tradingPrice)

      order.amount -= matchingAmount
      transaction.amount -= matchingAmount
      if (isBuyOrder(order)) {
        b.gbp_reserved -= tradingVolume
        b.xbt_available += matchingAmount
        orderLogger.logOrderBought(matchingAmount, tradingPrice)
      } else {
        b.gbp_available += tradingVolume
        b.xbt_reserved -= matchingAmount
        orderLogger.logOrderSold(matchingAmount, tradingPrice)
      }
    }
  }

  return {
    getAccount,
    increaseRequestCount,
    newBuyOrder,
    newSellOrder,
    getOpenOrders,
    cancelOrder,
    transactionsUpdate
  }
}

module.exports = TradeAccount
