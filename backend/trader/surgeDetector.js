const moment = require('moment')

const SurgeDetector = (logger, config) => {
  const slotDuration = config.timeslotSeconds
  const slotCount = config.buying.timeslotCount
  const buyRatio = config.buying.ratio

  let currentTransactions = []

  const createDateLimits = () => Array.from({ length: slotCount }, (_, ix) => {
    const now = moment().unix()
    return now - ((ix + 1) * slotDuration)
  })

  const createNewTransactions = (oldTransactions, txUpdate, dateLimit) => {
    const latestRecordedId = oldTransactions[0]
      ? oldTransactions[0].tid
      : 0
    const newTransactions = txUpdate
      .sort((txA, txB) => txB.tid - txA.tid)
      .filter(tx => tx.tid > latestRecordedId)
      .map(tx => {
        tx.amount = Number(tx.amount)
        return tx
      })

    return newTransactions.concat(oldTransactions)
      .filter(tx => tx.date > dateLimit)
  }

  const createBuckets = (dateLimits, transactions) => dateLimits.map(dateLimit =>
    transactions.findIndex(tx => tx.date < dateLimit)
  ).reduce((collected, endIx) => {
    if (endIx < 0) endIx = transactions.length

    collected.buckets.push(transactions.slice(collected.startIx, endIx))
    collected.startIx = endIx
    return collected
  }, { buckets: [], startIx: 0 }).buckets

  const createRatios = buckets => {
    const averagePrices = buckets.map(transactions => {
      const sums = transactions.reduce((sums, currentTx) => {
        sums.totalAmount += currentTx.amount
        sums.totalPounds += currentTx.amount * currentTx.price
        return sums
      }, { totalAmount: 0, totalPounds: 0 })
      return sums.totalPounds / sums.totalAmount
    })

    let previousAverage = averagePrices[0]
    return averagePrices.slice(1).map(averagePrice => {
      const ratio = (previousAverage - averagePrice) / slotDuration
      previousAverage = averagePrice
      return ratio
    })
  }

  const analyse = transactions => {
    const dateLimits = createDateLimits()
    const lastDateLimit = dateLimits[slotCount - 1]
    currentTransactions = createNewTransactions(currentTransactions, transactions, lastDateLimit)

    const buckets = createBuckets(dateLimits, currentTransactions)
    const ratios = createRatios(buckets)
    const isPriceSurging = ratios.every(ratio => ratio > buyRatio)

    return {
      isPriceSurging
    }
  }

  return { analyse }
}
module.exports = SurgeDetector
