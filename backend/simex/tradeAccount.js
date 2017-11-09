const moment = require('moment')

const { floorVolume, volumeString, amountString, priceString } = require('../utils/valuesHelper')
// order type: (0 - buy; 1 - sell)
const BUY_ORDER = 0
const SELL_ORDER = 1

const START_BALANCE_PENCE = 100000

const orderType = order => order.type === BUY_ORDER ? ' BUY order' : 'SELL order'

const TradeAccount = (clientId, logger) => {
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

  const log = message => {
    const ts = moment().format('YYYY-MM-DD HH:mm:ss')
    logger.info(`========== ${ts} [${clientId}] ${message}`)
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
    log(`${orderType(newOrder)} received: ${amountString(amount)} - ${priceString(price)}`)
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
    return newOpenOrder(BUY_ORDER, amount, price)
  }

  const newSellOrder = (amount, price) => {
    if (amount > b.xbt_available) {
      throw Error('selling more btcs than available: ' +
        `${amountString(amount)} > ${amountString(b.xbt_available)}`)
    }
    b.xbt_available -= amount
    b.xbt_reserved += amount
    return newOpenOrder(SELL_ORDER, amount, price)
  }

  const getOpenOrders = () => data.openOrders

  const cancelOrder = removeId => {
    let found = false
    data.openOrders = data.openOrders.filter(order => {
      if (order.id !== removeId) {
        return true
      }
      found = true
      if (order.type === BUY_ORDER) {
        const volume = floorVolume(order.amount, order.price)
        b.gbp_reserved -= volume
        b.gbp_available += volume
      }
      if (order.type === SELL_ORDER) {
        b.xbt_available += order.amount
        b.xbt_reserved -= order.amount
      }
      return false
    })
    return found
  }

  const transactionsUpdate = originalTxs => {
    const transactions = originalTxs
      .filter(tx => tx.tid > data.latestTransactionId)
      .map(tx => Object.assign({}, tx))
      .sort((txa, txb) => txb.tid - txa.tid)

    data.latestTransactionId = transactions[0].tid

    data.openOrders = data.openOrders.reduce((stillOpen, order) => {
      transactions.forEach(matchOrderWithTransaction(order))
      if (order.amount > 0) stillOpen.push(order)
      return stillOpen
    }, [])
  }

  const matchingBidPrice = (order, transaction) =>
    order.type === BUY_ORDER && order.price >= transaction.price

  const matchingAskPrice = (order, transaction) =>
    order.type === SELL_ORDER && order.price <= transaction.price

  const matchOrderWithTransaction = order => transaction => {
    if (order.amount <= 0 || transaction.amount <= 0) return
    if (matchingBidPrice(order, transaction) || matchingAskPrice(order, transaction)) {
      const matchingAmount = Math.min(order.amount, transaction.amount)
      order.amount -= matchingAmount
      transaction.amount -= matchingAmount
      if (order.type === BUY_ORDER) {
        b.gbp_reserved -= floorVolume(matchingAmount, order.price)
        b.xbt_available += matchingAmount
        log(`!! BOUGHT ${amountString(matchingAmount)} for ${priceString(order.price)}`)
      } else {
        b.gbp_available += floorVolume(matchingAmount, order.price)
        b.xbt_reserved -= matchingAmount
        log(`!!   SOLD ${amountString(matchingAmount)} for ${priceString(order.price)}`)
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
