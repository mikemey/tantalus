
const calculateMaxTime = workerConfigObject => {
  return workerConfigObject.traderConfigs.reduce((max, config) => {
    const maxTimeslots = Math.max(config.buying.useTimeslots, config.selling.useTimeslots)
    return Math.max(max, maxTimeslots * config.timeslotSeconds)
  }, 0)
}

const checkWindowSizes = (workerConfigObject, transactionsUpdateSeconds) => {
  workerConfigObject.traderConfigs.forEach(cfg => {
    if ((cfg.timeslotSeconds % transactionsUpdateSeconds) !== 0) {
      throw new Error(`transactionUpdateSeconds (${transactionsUpdateSeconds}) is not a divisor of timeslotSeconds (${cfg.timeslotSeconds})`)
    }
  })
}

const TransactionWindow = (workerConfigObject, transactionsUpdateSeconds) => {
  checkWindowSizes(workerConfigObject, transactionsUpdateSeconds)
  const maxHistory = calculateMaxTime(workerConfigObject)

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

    const slotEndDate = data.currentSliceEndDate
    const slotsIndices = createSlotsIndices(slotEndDate)

    data.currentSliceEndDate = data.currentSliceEndDate + transactionsUpdateSeconds
    const nextUpdateFull = data.dateIndices.has(data.currentSliceEndDate)

    return {
      nextUpdateFull,
      txsUpdate,
      transactions: data.transactions,
      slotEndDate,
      slotsIndices
    }
  }

  const createSlotsIndices = endDate => {
    const slotsIndices = new Map()
    const startDate = endDate - maxHistory
    let txIx
    for (let slotEndDate = endDate; slotEndDate >= startDate; slotEndDate -= transactionsUpdateSeconds) {
      txIx = data.dateIndices.get(slotEndDate)
      if (txIx === undefined) txIx = data.transactions.length
      slotsIndices.set(slotEndDate, txIx)
    }
    return slotsIndices
  }

  return {
    addBatchUpdate,
    nextTransactionUpdate
  }
}

module.exports = TransactionWindow
