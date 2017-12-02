const SlotsAverager = require('./slicing/slotsAverager')

const TransactionSlicer = (logger, workerConfigObject, transactionsUpdateSeconds, createSlotsAverager = SlotsAverager) => {
  const services = {
    // simulatedTraders: workerConfigObject.traderConfigs.map(createSimulatedTrader),
    slotsAverager: createSlotsAverager()
  }
  const data = {
    latestSliceTransactions: [],
    nextSliceStartDate: 0
  }

  const isReady = () => data.nextSliceStartDate !== 0

  const setStartDate = startDate => {
    data.nextSliceStartDate = startDate + transactionsUpdateSeconds
  }

  const runBatch = transactions => {
    const slices = sliceTransactions(transactions)
    if (slices.length) sendSlicesToTraders(slices)
  }

  const drainLastSlice = () => {
    sendSliceToTraders(createNextTransactionsSlice())
  }

  const sliceTransactions = transactions => transactions.reduce((allSlices, tx) => {
    if (tx.date >= data.nextSliceStartDate) {
      allSlices.push(...emptySlicesSince(tx.date))
      allSlices.push(createNextTransactionsSlice())
    }
    data.latestSliceTransactions.push(tx)
    return allSlices
  }, [])

  const emptySlicesSince = txDate => {
    const simulatedNow = data.nextSliceStartDate - 1
    const length = (txDate - simulatedNow) / transactionsUpdateSeconds
    if (length >= 1) {
      return Array.from({ length }, (_0, _1) => createNextTransactionsSlice())
    }
    return []
  }

  const createNextTransactionsSlice = () => {
    const newSlice = {
      unixNow: data.nextSliceStartDate - 1,
      transactions: data.latestSliceTransactions
        .sort((a, b) => b.tid - a.tid)
    }
    data.nextSliceStartDate += transactionsUpdateSeconds
    data.latestSliceTransactions = []
    return newSlice
  }

  const sendSlicesToTraders = slices => {
    for (var ix = 0, len = slices.length; ix < len; ix++) sendSliceToTraders(slices[ix])
  }

  const sendSliceToTraders = slice => {
    for (var ix = 0, len = data.simulatedTraders.length; ix < len; ix++) {
      data.simulatedTraders[ix].runTick(slice.unixNow, slice.transactions)
    }
  }

  return {
    runBatch,
    drainLastSlice,
    isReady,
    setStartDate
  }
}

module.exports = TransactionSlicer
