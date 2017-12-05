const SimulatedTrader = require('./simulatedTrader')
const TransactionWindow = require('./slicing/txWindow')
const SlotsAnalyzer = require('./slicing/slotsAnalyzer')
const SliceDistributor = require('./slicing/sliceDistributor')

const TransactionSlicer = (
  logger, workerConfigObject, transactionsUpdateSeconds,
  createTxWindow = TransactionWindow,
  createSlotsAnalyzer = SlotsAnalyzer,
  createSliceDistributor = SliceDistributor,
  createTraderFunc = SimulatedTrader
) => {
  const txWindow = createTxWindow(workerConfigObject, transactionsUpdateSeconds)
  const slotsAnalyzer = createSlotsAnalyzer(workerConfigObject)
  const sliceDistributor = createSliceDistributor(workerConfigObject, createTraderFunc)

  const runBatch = (fromDate, toDate, transactions) => {
    txWindow.addBatchUpdate(fromDate, toDate, transactions)
    iterateSlices()
  }

  const iterateSlices = () => {
    const nextTxs = txWindow.nextTransactionUpdate()
    const slotsRatios = slotsAnalyzer.buildSlotsRatios(nextTxs.transactions, nextTxs.slotsIndices, nextTxs.slotEndDate)
    sliceDistributor.distribute(nextTxs.txsUpdate, slotsRatios)
    if (nextTxs.nextUpdateFull) return iterateSlices()
  }

  const getBalances = () => sliceDistributor.getBalances()

  return {
    runBatch,
    drainLastSlice: iterateSlices,
    getBalances
  }
}

module.exports = TransactionSlicer
