const { mmBTC } = require('../utils/ordersHelper')

const checkRequiredConfiguration = config => {
  if (!config.timeslotSeconds) throw Error('config.timeslotSeconds not found!')
  checkUseTimeslots(config, 'buying')
  checkUseTimeslots(config, 'selling')
}

const checkUseTimeslots = (config, type) => {
  if (!(config[type] && config[type].useTimeslots && config[type].useTimeslots > 1)) {
    throw Error(`config.${type}.useTimeslots requires at least 2, found: ${config[type].useTimeslots}`)
  }
}

const SurgeDetector = (orderLogger, config, exchangeConnector, unixTime) => {
  checkRequiredConfiguration(config)
  const slotDuration = config.timeslotSeconds
  const buySlotCount = config.buying.useTimeslots
  const sellSlotCount = config.selling.useTimeslots
  const slotCount = Math.max(buySlotCount, sellSlotCount)

  const buyRatio = config.buying.ratio
  const sellRatio = config.selling.ratio

  const data = {
    cachedTransactions: [],
    latestPrice: 0,
    latestTransactionTid: 0,
    latestRatios: []
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
    switch (bucket.length) {
      case 0: return NaN
      case 1: return bucket[0].price
      default:
        const sums = bucket.reduce((sums, currentTx) => {
          sums.totalAmount += currentTx.amount
          sums.totalVolume += transactionVolume(currentTx)
          return sums
        }, { totalAmount: 0, totalVolume: 0 })
        return priceFrom(sums.totalVolume, sums.totalAmount)
    }
  }

  const transactionVolume = tx => Math.round(tx.amount * tx.price / mmBTC)
  const priceFrom = (volume, amount) => Math.round(volume / amount * mmBTC)

  const calculateRatios = (currentPrice, ix, averagePrices) => {
    if (ix === (averagePrices.length - 1)) return 0

    const previousPrice = averagePrices[ix + 1]
    return isNaN(currentPrice) || isNaN(previousPrice)
      ? 0
      : (currentPrice - previousPrice) / slotDuration
  }

  return {
    analyseTrends: () => exchangeConnector.getTransactions()
      .then(transactions => {
        const lastDateLimit = unixTime() - (slotCount * slotDuration)
        data.cachedTransactions = createNewTransactions(transactions, lastDateLimit)

        const ratios = groupInTimeslots(data.cachedTransactions)
          .map(sumupAmountsAndVolumes)
          .map(calculateRatios)
          .slice(0, -1)

        data.latestRatios = ratios
        const isPriceSurging = ratios.length && ratios.slice(0, buySlotCount).every(ratio => ratio >= buyRatio)
        const isUnderSellRatio = ratios.length && ratios.slice(0, sellSlotCount).every(ratio => ratio < sellRatio)

        return {
          latestPrice: data.latestPrice,
          isPriceSurging,
          isUnderSellRatio
        }
      }),
    getLatestRatios: () => data.latestRatios
  }
}

module.exports = SurgeDetector
