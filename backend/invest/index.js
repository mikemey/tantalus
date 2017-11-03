const express = require('express')
const schedule = require('node-schedule')
const moment = require('moment')

const requests = require('../utils/requests')

const coinfloorTransactionUrl = 'https://webapi.coinfloor.co.uk:8090/bist/XBT/GBP/transactions/'
const createInvestRouter = logger => {
  const router = express.Router()

  const transactionCache = {
    cutoffTimestamp: 0,
    data: []
  }
  let txidCache = []

  const filterExistingTransactions = txs => txs
    .filter(tx => !txidCache.includes(tx.tid))
  const mergeWithLatestTransactions = txs => txs.concat(transactionCache.data)
  const sortTransactions = txs => txs.sort((a, b) => b.tid - a.tid)

  const cutoffTimestamp = () => moment.utc().subtract(10, 'm').unix()
  const removeOutdatedTransactions = txs => {
    const cutoff = cutoffTimestamp()
    return {
      cutoff,
      data: txs.filter(tx => tx.date > cutoff)
    }
  }

  const updateTransactionCaches = filteredTxs => {
    console.log(`transactions previous: ${transactionCache.data.length} \tnew: ${filteredTxs.data.length}`)
    transactionCache.cutoffTimestamp = filteredTxs.cutoff
    transactionCache.data = filteredTxs.data
    txidCache = filteredTxs.data.map(tx => tx.tid)
  }

  const errorHandler = err => {
    console.error(err.message)
  }

  const updateLatestTransactions = () => requests
    .getJson(coinfloorTransactionUrl)
    .then(filterExistingTransactions)
    .then(mergeWithLatestTransactions)
    .then(sortTransactions)
    .then(removeOutdatedTransactions)
    .then(updateTransactionCaches)
    .catch(errorHandler)

  schedule.scheduleJob('10 * * * * *', updateLatestTransactions)

  router.get('/transactions', (req, res) =>
    res.status(200).json(transactionCache)
  )

  return router
}

module.exports = createInvestRouter
