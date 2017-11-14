const schedule = require('node-schedule')
const moment = require('moment')

const requests = require('../utils/requests')
const TransactionRepo = require('./transactionsRepo')

const TransactionsService = (tantalusLogger, config) => {
  const TX_SERVICE_URL = config.simex.transactionsServiceUrl
  const TXS_TTL = config.simex.transactionsTTLminutes
  const CACHE_UPDATE_SCHEDULING = config.simex.transactionsCacheUpateSchedule

  const transactionRepo = TransactionRepo()

  const data = {
    listeners: [],
    latestCachedCutoffTimestamp: 0,
    latestCachedTransactionId: 0,
    cachedTransactions: [],
    latestStoredTransactionId: undefined
  }

  const addTransactionsListener = listener => data.listeners.push(listener)

  const cacheTransactions = () => newExchangeTransactionsSince(data.latestCachedTransactionId)
    .then(mergeWithLatestTransactions)
    .then(sortTransactions)
    .then(removeOutdatedTransactions)
    .then(updateCachedTransactions)
    .then(callListeners)
    .catch(errorHandler)

  const storeTransactions = () => (data.latestStoredTransactionId === undefined
    ? transactionRepo.getLatestTransactionId()
    : Promise.resolve(data.latestStoredTransactionId)
  ).then(latestTid => newExchangeTransactionsSince(latestTid))
    .then(newTransactions => {
      tantalusLogger.info(`stored new transactions: ${newTransactions.length}`)
      if (newTransactions.length) {
        return transactionRepo.store(newTransactions)
      }
    })
    .then(updateLatestStoredTransactionId)
    .catch(errorHandler)

  const newExchangeTransactionsSince = latestTid => requests
    .getJson(TX_SERVICE_URL)
    .then(filterNewestTransactions(latestTid))
    .then(convertValues)

  const filterNewestTransactions = latestTid => txs =>
    txs.filter(tx => tx.tid > latestTid)

  const convertValues = txs => txs.map(tx => {
    tx.amount = Number(tx.amount.replace('.', ''))
    tx.price = Number(tx.price.replace('.', ''))
    return tx
  })

  const mergeWithLatestTransactions = txs => txs.concat(data.cachedTransactions)
  const sortTransactions = txs => txs.sort((a, b) => b.tid - a.tid)

  const cutoffTimestamp = () => moment.utc().subtract(TXS_TTL, 'm').unix()
  const removeOutdatedTransactions = txs => {
    const cutoff = cutoffTimestamp()
    return {
      cutoff,
      newTransactions: txs.filter(tx => tx.date > cutoff)
    }
  }

  const updateCachedTransactions = conversionResult => {
    data.latestCachedCutoffTimestamp = conversionResult.cutoff
    data.cachedTransactions = conversionResult.newTransactions
    if (conversionResult.newTransactions.length) {
      data.latestCachedTransactionId = conversionResult.newTransactions[0].tid
    }
  }

  const updateLatestStoredTransactionId = () => transactionRepo.getLatestTransactionId()
    .then(latestId => { data.latestStoredTransactionId = latestId })

  const callListeners = () => Promise.all(
    data.listeners.map(listener => listener(data.cachedTransactions))
  )

  const errorHandler = err => {
    tantalusLogger.error(err.message)
    tantalusLogger.log(err)
  }

  const scheduleCacheUpdate = () => schedule.scheduleJob(CACHE_UPDATE_SCHEDULING, cacheTransactions)

  return {
    cacheTransactions,
    storeTransactions,
    addTransactionsListener,
    scheduleCacheUpdate
  }
}

module.exports = TransactionsService
