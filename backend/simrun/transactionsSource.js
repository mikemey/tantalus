const { timestamp } = require('./simrunUtils')
const { TantalusLogger } = require('../utils/tantalusLogger')

const TransactionSource = (baseLogger, transactionRepo) => {
  const logger = TantalusLogger(baseLogger, 'TxsSource')

  const data = {
    batchSeconds: 0,
    nextStartDate: 0,
    endDate: 0
  }

  const init = batchSeconds => {
    data.batchSeconds = batchSeconds
    logger.info('retrieving earliest and latest date...')
    return Promise.all([
      transactionRepo.getEarliestTransaction(),
      transactionRepo.getLatestTransaction()
    ]).then(([earliest, latest]) => {
      data.nextStartDate = earliest.date
      data.endDate = latest.date
      logger.info(`using transactions from: ${timestamp(data.nextStartDate)}, to: ${timestamp(data.endDate)}`)
    })
  }

  const next = () => {
    if (data.nextStartDate > data.endDate) throw Error(`No more transactions available (latest date: ${data.endDate})!`)
    const from = data.nextStartDate
    const to = from + data.batchSeconds - 1

    data.nextStartDate = from + data.batchSeconds
    return transactionRepo.readTransactions(from, to)
      .then(transactions => {
        return { from, to, transactions }
      })
  }

  const hasNext = () => data.nextStartDate <= data.endDate

  return {
    init,
    next,
    hasNext
  }
}

module.exports = TransactionSource
