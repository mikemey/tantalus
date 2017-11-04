const express = require('express')
const schedule = require('node-schedule')
const moment = require('moment')

const requests = require('../utils/requests')

const coinfloorTransactionUrl = 'https://webapi.coinfloor.co.uk:8090/bist/XBT/GBP/transactions/'
const createInvestRouter = logger => {
  const router = express.Router()

  const transactionCache = {
    cutoffTimestamp: 0,
    transactionList: [],
    latestPrice: 0,
    priceGroups: []
  }
  let txidCache = []

  const filterExistingTransactions = txs => txs
    .filter(tx => !txidCache.includes(tx.tid))
  const mergeWithLatestTransactions = txs => txs.concat(transactionCache.transactionList)
  const sortTransactions = txs => txs.sort((a, b) => b.tid - a.tid)

  const cutoffTimestamp = () => moment.utc().subtract(10, 'm').unix()
  const removeOutdatedTransactions = txs => {
    const cutoff = cutoffTimestamp()
    return {
      cutoff,
      transactionList: txs.filter(tx => tx.date > cutoff),
      latestPrice: Number(txs[0].price)
    }
  }

  const calculateWeightedAmount = filteredTxs => {
    const timeScope = moment.utc().unix() - filteredTxs.cutoff
    filteredTxs.transactionList.forEach(tx => {
      tx.weightedAmount = (tx.amount * (tx.date - filteredTxs.cutoff) / timeScope)
    })
    return filteredTxs
  }

  const groupByPrices = (priceGroups, tx) => {
    const txPrice = Number(tx.price)
    const priceGroup = priceGroups.find(group => group.label === txPrice)

    if (priceGroup) {
      priceGroup.weighted += tx.weightedAmount
    } else {
      priceGroups.push({
        label: txPrice,
        weighted: tx.weightedAmount
      })
    }
    return priceGroups
  }

  const createPriceGroups = filteredTxs => {
    filteredTxs.priceGroups = filteredTxs.transactionList
      .reduce(groupByPrices, [])
      .sort((groupA, groupB) => groupA.label - groupB.label)
    return filteredTxs
  }

  const updateTransactionCaches = filteredTxs => {
    logger.info('transactions previous: %s \tnew: %s',
      transactionCache.transactionList.length,
      filteredTxs.transactionList.length
    )
    transactionCache.cutoffTimestamp = filteredTxs.cutoff
    transactionCache.transactionList = filteredTxs.transactionList
    transactionCache.latestPrice = filteredTxs.latestPrice
    transactionCache.priceGroups = filteredTxs.priceGroups
    txidCache = filteredTxs.transactionList.map(tx => tx.tid)
  }

  const errorHandler = err => {
    logger.error(err.message)
  }

  const updateLatestTransactions = () => requests
    .getJson(coinfloorTransactionUrl)
    .then(filterExistingTransactions)
    .then(mergeWithLatestTransactions)
    .then(sortTransactions)
    .then(removeOutdatedTransactions)
    .then(calculateWeightedAmount)
    .then(createPriceGroups)
    .then(updateTransactionCaches)
    .catch(errorHandler)

  schedule.scheduleJob('*/5 * * * * *', updateLatestTransactions)

  router.get('/transactions', (req, res) =>
    res.status(200).json(transactionCache)
  )

  return router
}

module.exports = createInvestRouter
