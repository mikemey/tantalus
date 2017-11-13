const moment = require('moment')

const InvestService = (logger, transactionsService) => {
  const humanReadableValues = newTransactions => newTransactions
    .map(tx => Object.assign({}, tx,
      { amount: tx.amount / 10000 },
      { price: tx.price / 100 }
    ))

  const cutoffTimestamp = () => moment.utc().subtract(30, 'm').unix()

  const removeOutdatedTransactions = txs => {
    const cutoff = cutoffTimestamp()
    return {
      cutoff,
      newTransactions: txs.filter(tx => tx.date > cutoff),
      latestPrice: txs[0] ? Number(txs[0].price) : cache.latestPrice
    }
  }

  const calculateWeightedAmount = txsData => {
    const timeScope = moment.utc().unix() - txsData.cutoff
    txsData.newTransactions.forEach(tx => {
      tx.weightedAmount = (tx.amount * (tx.date - txsData.cutoff) / timeScope)
    })
    return txsData
  }

  const createPriceGroups = txsData => {
    txsData.priceGroups = txsData.newTransactions
      .reduce(sumWeightedAmountByPrice, [])
      .sort((groupA, groupB) => groupA.label - groupB.label)
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

  const createPriceChanges = txsData => {
    txsData.priceChanges = txsData.newTransactions
      .reduce((cumulated, currentTx) => {
        const x = moment.unix(currentTx.date).toISOString()
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
  }

  const errorHandler = err => {
    logger.error(err.message)
  }

  const updateLatestTransactions = newTransactions => Promise
    .resolve(humanReadableValues(newTransactions))
    .then(removeOutdatedTransactions)
    .then(calculateWeightedAmount)
    .then(createPriceGroups)
    .then(createPriceChanges)
    .then(updateTransactionCaches)
    .catch(errorHandler)

  transactionsService.addTransactionsListener(updateLatestTransactions)

  const cache = {
    cutoffTimestamp: 0,
    transactionsList: [],
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

module.exports = InvestService
