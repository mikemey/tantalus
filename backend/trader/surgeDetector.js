const moment = require('moment')
const { createOrderLogger } = require('../utils/ordersHelper')

const SurgeDetector = (baseLogger, config, exchangeConnector) => {
  const orderLogger = createOrderLogger(baseLogger)
  const slotDuration = config.timeslotSeconds
  const buySlotCount = config.buying.useTimeslots
  const sellSlotCount = config.selling.useTimeslots
  const slotCount = Math.max(buySlotCount, sellSlotCount)

  const buyRatio = config.buying.ratio
  const sellRatio = config.selling.ratio

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
        if (currentTx === undefined) orderLogger.error('SURGE.createRatios.currentTx')
        sums.totalAmount += currentTx.amount
        sums.totalPence += currentTx.amount * currentTx.price
        return sums
      }, { totalAmount: 0, totalPence: 0 })
      return sums.totalPence / sums.totalAmount
    })

    let previousAverage = averagePrices[0]
    return averagePrices.slice(1).map(averagePrice => {
      const ratio = (previousAverage - averagePrice) / slotDuration
      previousAverage = averagePrice
      return ratio
    })
  }

  return {
    analyseTrends: () => exchangeConnector.getTransactions()
      .then(transactions => {
        if (transactions.length === 0) return { isPriceSurging: false, isUnderSellRatio: false }

        const dateLimits = createDateLimits()
        const lastDateLimit = dateLimits[slotCount - 1]
        currentTransactions = createNewTransactions(currentTransactions, transactions, lastDateLimit)

        const buckets = createBuckets(dateLimits, currentTransactions)
        const ratios = createRatios(buckets)

        if (currentTransactions === undefined) orderLogger.error('SURGE.checkBoughtSoldOrder.analyseTrends')
        const latestPrice = currentTransactions[0].price
        const isPriceSurging = ratios.slice(0, buySlotCount).every(ratio => ratio >= buyRatio)
        const isUnderSellRatio = ratios.slice(0, sellSlotCount).every(ratio => ratio < sellRatio)

        return { latestPrice, isPriceSurging, isUnderSellRatio }
      })
  }
}

module.exports = SurgeDetector
