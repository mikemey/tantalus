const { floorAmount, mmBTC } = require('../utils/ordersHelper')

const SurgeDetector = (baseLogger, config, exchangeConnector, unixTime) => {
  const slotDuration = config.timeslotSeconds
  const buySlotCount = config.buying.useTimeslots
  const sellSlotCount = config.selling.useTimeslots
  const slotCount = Math.max(buySlotCount, sellSlotCount)

  const buyRatio = config.buying.ratio
  const sellRatio = config.selling.ratio

  const data = {
    cachedTransactions: [],
    latestPrice: 0,
    latestTransactionTid: 0
  }

  const createNewTransactions = (txUpdate, dateLimit) => {
    const allTransactions = txUpdate.filter(tx => tx.tid > data.latestTransactionTid)
      .map(convertTransactionAmount)
      .concat(data.cachedTransactions)
      .sort((txA, txB) => txB.tid - txA.tid)

    data.latestTransactionTid = allTransactions[0] ? allTransactions[0].tid : data.latestTransactionTid
    data.latestPrice = allTransactions[0] ? allTransactions[0].price : 0
    return allTransactions.filter(tx => tx.date >= dateLimit)
  }

  const convertTransactionAmount = tx => {
    tx.amount = Number(tx.amount)
    return tx
  }

  const groupInTimeslots = transactions => Array
    .from({ length: slotCount }, (_, ix) => {
      return {
        latest: unixTime() - (ix * slotDuration),
        earliest: unixTime() - ((ix + 1) * slotDuration)
      }
    })
    .map(({ latest, earliest }) => transactions.filter(tx => {
      return tx.date < latest && tx.date > earliest
    }))

  const sumupAmountsAndVolumes = bucket => {
    const startSums = { totalAmount: 0, totalVolume: 0 }
    switch (bucket.length) {
      case 0: return startSums
      case 1: return {
        totalAmount: bucket[0].amount,
        totalVolume: transactionVolume(bucket[0])
      }
      default: return bucket.reduce((sums, currentTx) => {
        sums.totalAmount += currentTx.amount
        sums.totalVolume += transactionVolume(currentTx)
        return sums
      }, startSums)
    }
  }

  const transactionVolume = tx => Math.round(tx.amount * tx.price / mmBTC)

  const calculateRatios = (currentPrice, ix, averagePrices) => {
    if (ix === (averagePrices.length - 1)) return 0

    const previousPrice = averagePrices[ix + 1]
    return (currentPrice - previousPrice) / slotDuration
  }

  return {
    analyseTrends: () => exchangeConnector.getTransactions()
      .then(transactions => {
        const lastDateLimit = unixTime() - (slotCount * slotDuration)
        data.cachedTransactions = createNewTransactions(transactions, lastDateLimit)

        const ratios = groupInTimeslots(data.cachedTransactions)
          .map(sumupAmountsAndVolumes)
          .map(sums => floorAmount(sums.totalVolume, sums.totalAmount))
          .map(calculateRatios)

        const isPriceSurging = ratios.length && ratios.slice(0, buySlotCount - 1).every(ratio => ratio >= buyRatio)
        const isUnderSellRatio = ratios.length && ratios.slice(0, sellSlotCount - 1).every(ratio => ratio < sellRatio)

        return {
          latestPrice: data.latestPrice,
          isPriceSurging,
          isUnderSellRatio
        }
      })
  }
}

module.exports = SurgeDetector
