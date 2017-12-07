const { timestamp } = require('../simrunUtils')

const TransactionSource = (logger, transactionRepo) => {
  const data = {
    batchSeconds: 0,
    nextStartDate: 0,
    startDate: 0,
    startPrice: 0,
    endDate: 0,
    endPrice: 0,
    transactionCount: 0,
    batchCount: 0,
    currentBatchNum: 0
  }

  const reset = batchSeconds => {
    data.batchSeconds = batchSeconds
    return Promise.all([
      transactionRepo.getEarliestTransaction(),
      transactionRepo.getLatestTransaction()
    ]).then(([earliestTx, latestTx]) => {
      data.startDate = data.nextStartDate = earliestTx.date
      data.startPrice = earliestTx.price

      data.endDate = latestTx.date
      data.endPrice = latestTx.price

      data.batchCount = Math.ceil((data.endDate - data.startDate) / (data.batchSeconds - 1))
      data.currentBatchNum = 0

      return transactionRepo.countTransactionsBetween(data.startDate, data.endDate)
    }).then(txsCount => {
      data.transactionCount = txsCount
      logger.info(`Transactions count : ${data.transactionCount}`)
      logger.info(`Transactions period: ${data.nextStartDate} -> ${data.endDate}`)
      logger.info(`Transactions period: ${timestamp(data.nextStartDate)} -> ${timestamp(data.endDate)}`)
    })
  }

  const next = () => {
    if (data.nextStartDate > data.endDate) throw Error(`No more transactions available (latest date: ${data.endDate})!`)
    const batchNum = ++data.currentBatchNum
    const from = data.nextStartDate
    const to = Math.min(from + data.batchSeconds - 1, data.endDate + 1)

    data.nextStartDate = from + data.batchSeconds
    return transactionRepo.readTransactions(from, to)
      .then(transactions => {
        return { batchNum, from, to, transactions }
      })
  }

  const hasNext = () => data.nextStartDate <= data.endDate

  return {
    reset,
    next,
    hasNext,
    getStartDate: () => data.startDate,
    getStartPrice: () => data.startPrice,
    getEndDate: () => data.endDate,
    getEndPrice: () => data.endPrice,
    transactionCount: () => data.transactionCount,
    batchCount: () => data.batchCount
  }
}

module.exports = TransactionSource
