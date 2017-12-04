
const calculateMaxTime = workerConfigObject => {
  return workerConfigObject.traderConfigs.reduce((max, config) => {
    const maxTimeslots = Math.max(config.buying.useTimeslots, config.selling.useTimeslots)
    return Math.max(max, maxTimeslots * config.timeslotSeconds)
  }, 0)
}

const checkWindowSizes = (transactionsUpdateSeconds, maxHistory) => {
  if ((maxHistory % transactionsUpdateSeconds) !== 0) {
    throw new Error(`transactionUpdateSeconds (${transactionsUpdateSeconds}) is not a divisor of maximum slots window size (${maxHistory})`)
  }
}

const TransactionWindow = (workerConfigObject, transactionsUpdateSeconds) => {
  const maxHistory = calculateMaxTime(workerConfigObject)
  checkWindowSizes(transactionsUpdateSeconds, maxHistory)

  const data = {
    currentSliceEndDate: 0,
    currentBatchEndDate: 0,
    transactions: [],
    dateIndices: new Map()
  }

  const addBatchUpdate = (fromDate, toDate, transactions) => {
    if (data.currentSliceEndDate === 0) data.currentSliceEndDate = fromDate + transactionsUpdateSeconds - 1
    data.currentBatchEndDate = toDate

    data.transactions = data.transactions.concat(transactions)
    reindexDates()
  }

  const reindexDates = () => {
    const outOfDate = data.currentSliceEndDate - maxHistory
    const keepIndex = data.dateIndices.get(outOfDate) || 0
    data.transactions = data.transactions.slice(keepIndex, data.transactions.length)

    data.dateIndices = new Map()
    let updateStartDate = outOfDate
    for (let lastTxIx = 0; updateStartDate < data.currentBatchEndDate;) {
      data.dateIndices.set(updateStartDate, lastTxIx)

      updateStartDate += transactionsUpdateSeconds
      lastTxIx = findDateIx(lastTxIx, updateStartDate)
    }
  }

  const findDateIx = (startIx, dateLimit) => {
    for (let txIx = startIx, len = data.transactions.length; txIx < len; txIx++) {
      if (data.transactions[txIx].date > dateLimit) {
        return txIx
      }
    }
    return data.transactions.length
  }

  const nextTransactionUpdate = () => {
    const updateStartIx = data.dateIndices.get(data.currentSliceEndDate - transactionsUpdateSeconds) || 0
    const updateEndIx = data.dateIndices.get(data.currentSliceEndDate)
    const txsUpdate = data.transactions.slice(updateStartIx, updateEndIx)

    const slotsStartIx = data.dateIndices.get(data.currentSliceEndDate - maxHistory) || 0
    const slotsEndIx = updateEndIx
    const slotsWindow = data.transactions.slice(slotsStartIx, slotsEndIx).reverse()

    data.currentSliceEndDate = data.currentSliceEndDate + transactionsUpdateSeconds
    const nextUpdateFull = data.dateIndices.has(data.currentSliceEndDate)
    return {
      nextUpdateFull,
      txsUpdate,
      slotsWindow
    }
  }

  return {
    addBatchUpdate,
    nextTransactionUpdate
  }
}

module.exports = TransactionWindow
