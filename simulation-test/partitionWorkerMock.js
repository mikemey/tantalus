const requests = require('../utils/requests')

class PartitionWorkerMock {
  constructor () {
    this.sendResults = (action, results) => requests
      .postJson(`http://localhost:12345/${action}`, results)
  }

  createTraders (workerConfig) {
    return this.sendResults('createTradersCalled', workerConfig)
  }

  runIteration (iterationProgress) {
    return this.sendResults('runIterationCalled', iterationProgress)
  }

  getAccounts () {
    return [
      { fullVolume: process.pid * 2 },
      { fullVolume: process.pid }
    ]
  }
}

module.exports = PartitionWorkerMock
