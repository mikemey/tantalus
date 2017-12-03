
const TransactionWindow = (workerConfigObject, transactionsUpdateSeconds) => {
  const data = {
    nextSliceStartDate: 0
  }

  const addBatchUpdate = (fromDate, toDate, transactions) => {
    if (data.nextSliceStartDate === 0) data.nextSliceStartDate = fromDate
  }

  const getTransactionUpdate = () => { }

  return {
    addBatchUpdate,
    getTransactionUpdate
  }
}

module.exports = TransactionWindow
