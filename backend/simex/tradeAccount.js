const moment = require('moment')

const {
  BUY_ORDER_TYPE, SELL_ORDER_TYPE, isBuyOrder, isSellOrder,
  roundVolume, amountString, volumeString,
  OrderLogger
 } = require('../utils/ordersHelper')

const { TantalusLogger } = require('../utils/tantalusLogger')

const START_BALANCE_PENCE = 100000

const randomStartId = () => Math.floor(Math.random() * 89 + 10) * 1000

const TradeAccount = (tantalusLogger, clientId) => {
  const orderLogger = OrderLogger(TantalusLogger(tantalusLogger.baseLogger, clientId))

  const stats = {
    clientId,
    startDate: moment.utc(),
    requestCount: 0
  }

  const account = {
    gbp_balance: START_BALANCE_PENCE,
    xbt_balance: 0
  }

  const orders = {
    latestId: randomStartId(),
    open: [],
    latestTransactionId: 0
  }

  const calculateAccount = () => {
    const balances = orders.open.reduce((bal, openOrder) => {
      if (isBuyOrder(openOrder)) {
        const volume = roundVolume(openOrder.amount, openOrder.price)
        bal.gbp_reserved += volume
      }
      if (isSellOrder(openOrder)) {
        bal.xbt_reserved += openOrder.amount
      }
      return bal
    }, { gbp_reserved: 0, xbt_reserved: 0 })

    balances.gbp_balance = account.gbp_balance
    balances.gbp_available = account.gbp_balance - balances.gbp_reserved
    balances.xbt_balance = account.xbt_balance
    balances.xbt_available = account.xbt_balance - balances.xbt_reserved
    return balances
  }

  const getAccount = () => Object.assign(
    { balances: calculateAccount() },
    stats
  )

  const increaseRequestCount = () => { stats.requestCount += 1 }

  const newOpenOrder = (type, amount, price) => {
    const newOrder = {
      id: orders.latestId++,
      datetime: moment.utc().unix(),
      type,
      price,
      amount
    }
    orderLogger.logNewOrder(newOrder)
    orders.open.push(newOrder)
    return newOrder
  }

  const newBuyOrder = (amount, price) => {
    const volume = roundVolume(amount, price)
    const account = calculateAccount()
    if (volume > account.gbp_available) {
      throw Error('buying with more volume than available: ' +
        `${volumeString(volume)} > ${volumeString(account.gbp_available)}`)
    }
    return newOpenOrder(BUY_ORDER_TYPE, amount, price)
  }

  const newSellOrder = (amount, price) => {
    const account = calculateAccount()
    if (amount > account.xbt_available) {
      throw Error('selling more btcs than available: ' +
        `${amountString(amount)} > ${amountString(account.xbt_available)}`)
    }
    return newOpenOrder(SELL_ORDER_TYPE, amount, price)
  }

  const getOpenOrders = () => orders.open

  const cancelOrder = removeId => {
    let found = false
    orders.open = orders.open.filter(order => {
      if (order.id !== removeId) {
        return true
      }
      found = true
      orderLogger.logCancelledOrder(order)
      return false
    })
    return found
  }

  const transactionsUpdate = txsUpdate => {
    const transactions = txsUpdate
      .filter(tx => tx.tid > orders.latestTransactionId)
      .map(tx => Object.assign({}, tx))
      .sort((txa, txb) => txb.tid - txa.tid)

    if (transactions.length > 0) {
      orders.latestTransactionId = transactions[0].tid
      orders.open = orders.open.reduce((stillOpen, order) => {
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
      const tradingPrice = order.price // use order price as middle ground
      const tradingVolume = roundVolume(matchingAmount, tradingPrice)

      order.amount -= matchingAmount
      transaction.amount -= matchingAmount
      if (isBuyOrder(order)) {
        account.gbp_balance -= tradingVolume
        account.xbt_balance += matchingAmount
        orderLogger.logOrderBought(order.id, matchingAmount, tradingPrice)
      } else {
        account.gbp_balance += tradingVolume
        account.xbt_balance -= matchingAmount
        orderLogger.logOrderSold(order.id, matchingAmount, tradingPrice)
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
    transactionsUpdate,
    account
  }
}

module.exports = TradeAccount
