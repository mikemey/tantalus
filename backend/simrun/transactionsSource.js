const TransactionSource = transactionRepo => {
  const data = {
    batchSeconds: 0,
    startDate: 0,
    endDate: 0
  }

  const init = batchSeconds => {
    data.batchSeconds = batchSeconds
    return Promise.all([
      transactionRepo.getEarliestTransaction(),
      transactionRepo.getLatestTransaction()
    ]).then(([earliest, latest]) => {
      data.startDate = earliest
      data.endDate = latest
    })
  }

  const next = () => {
    if (data.startDate > data.endDate) throw Error(`No more transactions available (latest date: ${data.endDate})!`)
    const from = data.startDate
    const to = from + data.batchSeconds - 1

    data.startDate = from + data.batchSeconds
    const next = data.startDate <= data.endDate
    return transactionRepo.readTransactions(from, to)
      .then(transactions => {
        return { from, to, next, transactions }
      })
  }

  return {
    init,
    next
  }
}

module.exports = TransactionSource
