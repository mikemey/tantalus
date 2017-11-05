const schedule = require('node-schedule')
const moment = require('moment')

const requests = require('../utils/requests')

const coinfloorTransactionUrl = 'https://webapi.coinfloor.co.uk:8090/bist/XBT/GBP/transactions/'

const TransactionsService = logger => {
  const filterExistingTransactions = txs => txs
    .filter(tx => !cache.txidsList.includes(tx.tid))
  const mergeWithLatestTransactions = txs => txs.concat(cache.transactionsList)
  const sortTransactions = txs => txs.sort((a, b) => b.tid - a.tid)

  const cutoffTimestamp = () => moment.utc().subtract(10, 'm').unix()
  const removeOutdatedTransactions = txs => {
    const cutoff = cutoffTimestamp()
    return {
      cutoff,
      newTransactions: txs.filter(tx => tx.date > cutoff),
      latestPrice: Number(txs[0].price)
    }
  }

  const calculateWeightedAmount = filteredTxs => {
    const timeScope = moment.utc().unix() - filteredTxs.cutoff
    filteredTxs.newTransactions.forEach(tx => {
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
    filteredTxs.priceGroups = filteredTxs.newTransactions
      .reduce(groupByPrices, [])
      .sort((groupA, groupB) => groupA.label - groupB.label)
    return filteredTxs
  }

  const updateTransactionCaches = filteredTxs => {
    logger.info('%s transactions previous: %s \tnew: %s',
      moment.utc().format('HH:mm:ss'),
      cache.transactionsList.length,
      filteredTxs.newTransactions.length
    )
    cache.cutoffTimestamp = filteredTxs.cutoff
    cache.transactionsList = filteredTxs.newTransactions
    cache.latestPrice = filteredTxs.latestPrice
    cache.priceGroups = filteredTxs.priceGroups
    cache.txidsList = filteredTxs.newTransactions.map(tx => tx.tid)
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

  schedule.scheduleJob('4-57/4 * * * * *', updateLatestTransactions)

  const cache = {
    cutoffTimestamp: 0,
    transactionsList: [],
    txidsList: [],
    latestPrice: 0,
    priceGroups: []
  }

  return {
    getTransactionsData: () => (({
      cutoffTimestamp,
      transactionsList,
      latestPrice,
      priceGroups
     }) =>
      ({
        cutoffTimestamp,
        transactionsList,
        latestPrice,
        priceGroups
      }))(cache)
  }
}

module.exports = TransactionsService
