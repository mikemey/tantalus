const schedule = require('node-schedule')
const moment = require('moment')

const mongo = require('../utils/mongoConnection')
const requests = require('../utils/requests')
const { createOrderLogger } = require('../utils/ordersHelper')

const TransactionRepo = () => {
  const transactionsCollection = () => mongo.db.collection(mongo.transactionCollectionName)

  const getLatestTransactionId = () => transactionsCollection()
    .find({}, { tid: true })
    .sort({ tid: -1 })
    .limit(1)
    .toArray()
    .then(transactions => transactions.length ? transactions[0].tid : 0)

  const storeTransactions = transactions => transactionsCollection().insertMany(transactions)
    .then(result => {
      if (result.insertedCount === transactions.length) return transactions
      else throw new Error('insert transactions failed: ' + result.message)
    })

  return {
    getLatestTransactionId,
    storeTransactions
  }
}

const TransactionsService = (baseLogger, config) => {
  const logger = createOrderLogger(baseLogger, 'TXS')
  const TX_SERVICE_URL = config.simex.transactionsServiceUrl
  const TXS_TTL = config.simex.transactionsTTLminutes
  const SCHEDULING = config.simex.transactionsUpateSchedule

  const transactionRepo = TransactionRepo()

  const data = {
    listeners: [],
    latestCachedCutoffTimestamp: 0,
    latestCachedTransactionId: 0,
    cachedTransactions: [],
    latestStoredTransactionId: undefined
  }

  const addTransactionsListener = listener => data.listeners.push(listener)

  const cacheTransactions = () => newTransactionsSince(data.latestCachedTransactionId)
    .then(mergeWithLatestTransactions)
    .then(sortTransactions)
    .then(removeOutdatedTransactions)
    .then(updateCachedTransactions)
    .then(callListeners)
    .catch(errorHandler)

  const storeTransactions = () => (data.latestStoredTransactionId === undefined
    ? transactionRepo.getLatestTransactionId()
    : Promise.resolve(data.latestStoredTransactionId)
  ).then(latestTid => newTransactionsSince(latestTid))
    .then(newTransactions => {
      if (newTransactions.length) {
        return transactionRepo.storeTransactions(newTransactions)
      }
    })
    .then(updateLatestStoredTransactionId)
    .catch(errorHandler)

  const newTransactionsSince = latestTid => requests
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
    logger.error(err.message)
    logger.log(err)
  }

  const startScheduling = () => schedule.scheduleJob(SCHEDULING, cacheTransactions)

  return {
    cacheTransactions,
    storeTransactions,
    addTransactionsListener,
    startScheduling
  }
}

module.exports = TransactionsService
