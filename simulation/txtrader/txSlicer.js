const TransactionWindow = require('./slicing/txWindow')
const SlotsAnalyzer = require('./slicing/slotsAnalyzer')
const SliceDistributor = require('./slicing/sliceDistributor')

const TransactionSlicer = (
  logger, workerConfigObject, transactionsUpdateSeconds,
  createTxWindow = TransactionWindow,
  createSlotsAnalyzer = SlotsAnalyzer,
  createSliceDistributor = SliceDistributor
) => {
  const txWindow = createTxWindow(workerConfigObject)
  const slotsAnalyzer = createSlotsAnalyzer(workerConfigObject)
  const sliceDistributor = createSliceDistributor(workerConfigObject)

  const data = {
    nextSliceStartDate: 0
  }

  const runBatch = (fromDate, toDate, transactions) => {
    if (data.nextSliceStartDate === 0) data.nextSliceStartDate = fromDate
    txWindow.addBatchUpdate(fromDate, toDate, transactions)

    iterateSlices()
  }

  const iterateSlices = () => {
    const nextTxs = txWindow.getTransactionUpdate(data.nextSliceStartDate)
    data.nextSliceStartDate += transactionsUpdateSeconds

    const slotsRatios = slotsAnalyzer.buildSlotsRatios(nextTxs.txsWindow)
    sliceDistributor.distribute(nextTxs.txsUpdate, slotsRatios)
    if (nextTxs.nextUpdateFull) return iterateSlices()
  }

  return {
    runBatch,
    drainLastSlice: iterateSlices
  }
}

module.exports = TransactionSlicer
