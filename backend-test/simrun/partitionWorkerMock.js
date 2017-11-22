const requests = require('../../backend/utils/requests')

class PartitionWorkerMock {
  constructor () {
    this.sendResults = (action, results) => requests
      .postJson(`http://localhost:12345/${action}`, results)
  }

  createTraders (logger, workerConfig) {
    return this.sendResults('createTradersCalled', workerConfig)
  }

  drainTransactions (transactionsSlice) {
    return this.sendResults('drainTransactionsCalled', transactionsSlice)
  }

  getAccounts () {
    return [
      { fullValue: process.pid * 2 },
      { fullValue: process.pid }
    ]
  }
}

module.exports = PartitionWorkerMock
