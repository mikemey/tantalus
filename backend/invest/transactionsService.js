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

  const calculateWeightedAmount = txsData => {
    const timeScope = moment.utc().unix() - txsData.cutoff
    txsData.newTransactions.forEach(tx => {
      tx.weightedAmount = (tx.amount * (tx.date - txsData.cutoff) / timeScope)
    })
    return txsData
  }

  const sumWeightedAmountByPrice = (priceGroups, tx) => {
    const parsedPrice = Number(tx.price)
    tx.price = parsedPrice

    const priceGroup = priceGroups.find(group => group.label === tx.price)

    if (priceGroup) {
      priceGroup.weighted += tx.weightedAmount
    } else {
      priceGroups.push({
        label: tx.price,
        weighted: tx.weightedAmount
      })
    }
    return priceGroups
  }

  const createPriceGroups = txsData => {
    txsData.priceGroups = txsData.newTransactions
      .reduce(sumWeightedAmountByPrice, [])
      .sort((groupA, groupB) => groupA.label - groupB.label)
    return txsData
  }

  // const isSameSecond = (unixDateA, unixDateB) =>
  // moment.unix(unixDateA).isSame(moment.unix(unixDateB), 'second')
  // const keepLastTransactionPerDate = ({ latestTransactions, lastDate }, tx) => {
  //   if (lastDate === tx.date) {
  //     latestTransactions.pop()
  //   }
  //   latestTransactions.push(tx)

  //   lastDate = tx.date
  //   return { latestTransactions, lastDate }
  // }

  const createPriceChanges = txsData => {
    txsData.priceChanges = txsData.newTransactions
      // .reduce(keepLastTransactionPerDate, { latestTransactions: [], lastDate: 0 })
      // .latestTransactions
      .reduce((cumulated, currentTx) => {
        const x = moment.unix(currentTx.date)
        const y = cumulated.lastTx
          ? cumulated.lastTx.price - currentTx.price
          : 0

        cumulated.result.push({ x, y })
        cumulated.lastTx = currentTx
        return cumulated
      }, { result: [], lastTx: null }).result
    return txsData
  }

  const updateTransactionCaches = txsData => {
    cache.cutoffTimestamp = txsData.cutoff
    cache.transactionsList = txsData.newTransactions
    cache.latestPrice = txsData.latestPrice
    cache.priceGroups = txsData.priceGroups
    cache.priceChanges = txsData.priceChanges
    cache.txidsList = txsData.newTransactions.map(tx => tx.tid)
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
    .then(createPriceChanges)
    .then(updateTransactionCaches)
    .catch(errorHandler)

  schedule.scheduleJob('4-57/4 * * * * *', updateLatestTransactions)

  const cache = {
    cutoffTimestamp: 0,
    transactionsList: [],
    txidsList: [],
    latestPrice: 0,
    priceGroups: [],
    priceChanges: []
  }

  return {
    getTransactionsData: () => (({
      cutoffTimestamp,
      transactionsList,
      latestPrice,
      priceGroups,
      priceChanges
     }) =>
      ({
        cutoffTimestamp,
        transactionsList,
        latestPrice,
        priceGroups,
        priceChanges
      }))(cache)
  }
}

module.exports = TransactionsService
