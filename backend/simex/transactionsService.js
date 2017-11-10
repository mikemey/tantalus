const schedule = require('node-schedule')
const moment = require('moment')

const requests = require('../utils/requests')
const { createOrderLogger } = require('../utils/valuesHelper')

const TransactionsService = (baseLogger, config) => {
  const logger = createOrderLogger(baseLogger, 'TXS')
  const TX_SERVICE_URL = config.simex.transactionsServiceUrl
  const TXS_TTL = config.simex.transactionsTTLminutes
  const SCHEDULING = config.simex.transactionsUpateSchedule

  const data = {
    listeners: [],
    lastTransactionsIds: [],
    lastTransactions: [],
    lastCutoffTimestamp: 0
  }

  const addTransactionsListener = listener => data.listeners.push(listener)

  const updateTransactions = () => requests
    .getJson(TX_SERVICE_URL)
    .then(filterExistingTransactions)
    .then(convertValues)
    .then(mergeWithLatestTransactions)
    .then(sortTransactions)
    .then(removeOutdatedTransactions)
    .then(updateLastTransactions)
    .then(callListeners)
    .catch(errorHandler)

  const filterExistingTransactions = txs => txs
    .filter(tx => !data.lastTransactionsIds.includes(tx.tid))

  const convertValues = txs => txs.map(tx => {
    tx.amount = Number(tx.amount.replace('.', ''))
    tx.price = Number(tx.price.replace('.', ''))
    return tx
  })

  const mergeWithLatestTransactions = txs => txs.concat(data.lastTransactions)
  const sortTransactions = txs => txs.sort((a, b) => b.tid - a.tid)

  const cutoffTimestamp = () => moment.utc().subtract(TXS_TTL, 'm').unix()
  const removeOutdatedTransactions = txs => {
    const cutoff = cutoffTimestamp()
    return {
      cutoff,
      newTransactions: txs.filter(tx => tx.date > cutoff)
    }
  }

  const updateLastTransactions = conversionResult => {
    data.lastCutoffTimestamp = conversionResult.cutoff
    data.lastTransactions = conversionResult.newTransactions
    data.lastTransactionsIds = conversionResult.newTransactions.map(tx => tx.tid)
  }

  const callListeners = () => Promise.all(
    data.listeners.map(listener => listener(data.lastTransactions))
  )

  const errorHandler = err => {
    logger.error(err.message)
  }

  const startScheduling = () => schedule.scheduleJob(SCHEDULING, updateTransactions)

  return {
    addTransactionsListener,
    updateTransactions,
    startScheduling
  }
}

module.exports = TransactionsService
