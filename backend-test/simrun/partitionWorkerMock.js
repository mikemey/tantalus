const requests = require('../../backend/utils/requests')

class PartitionWorkerMock {
  constructor () {
    this.starIx = 0
    this.endIx = 0
    this.sendResults = (action, results) => requests
      .postJson(`http://localhost:12345/${action}`, results)
  }

  createTraders (workerConfig) {
    return this.sendResults('createTradersCalled', workerConfig)
  }

  drainTransactions (transactionsSlice) {
    return this.sendResults('drainTransactionsCalled', transactionsSlice)
  }

  getAccounts () {
    return [
      { fullVolume: process.pid * 2 },
      { fullVolume: process.pid }
    ]
  }
}

module.exports = PartitionWorkerMock
