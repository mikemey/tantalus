const express = require('express')
const bodyParser = require('body-parser')

const PartitionExecutor = require('../../backend/simrun/partitionExecutor')

const PartitionWorkerMockReceiver = () => {
  const data = {
    server: null,
    createdTradersCalled: [],
    drainTransactionsCalled: []
  }

  const createTradersCalled = (req, res) => {
    data.createdTradersCalled.push(req.body)
    return res.status(200).send()
  }

  const drainTransactionsCalled = (req, res) => {
    data.drainTransactionsCalled.push(req.body)
    return res.status(200).send()
  }

  const startServer = () => new Promise((resolve, reject) => {
    const app = express()
    app.use(bodyParser.json())
    app.post('/createTradersCalled', createTradersCalled)
    app.post('/drainTransactionsCalled', drainTransactionsCalled)
    data.server = app.listen(12345, resolve)
  })

  const stopServer = () => data.server
    ? new Promise((resolve, reject) => data.server.close(resolve))
    : Promise.resolve()

  return {
    startServer,
    stopServer,
    getCreatedTradersCalled: () => data.createdTradersCalled,
    getDrainTransactionsCalled: () => data.drainTransactionsCalled
  }
}

describe.only('Partition executor', function () {
  this.timeout(5000)

  const executorConfig = {
    partitionWorkerCount: 5
  }

  const traderConfigs = [
    { a: 'ab' }, { a: 'cd' },
    { a: 'ef' }, { a: 'gh' }, { a: 'ij' },
    { a: 'kl' }, { a: 'mn' },
    { a: 'op' }, { a: 'qr' }, { a: 'st' },
    { a: 'uv' }, { a: 'wx' }
  ]

  const expectedTraderConfigs = [
    { traderConfigs: [traderConfigs[0], traderConfigs[1]] },
    { traderConfigs: [traderConfigs[2], traderConfigs[3], traderConfigs[4]] },
    { traderConfigs: [traderConfigs[5], traderConfigs[6]] },
    { traderConfigs: [traderConfigs[7], traderConfigs[8], traderConfigs[9]] },
    { traderConfigs: [traderConfigs[10], traderConfigs[11]] }
  ]

  let partitionExecutor, partitionWorkerMockReceiver

  const startExecutorAndReceiver = () => {
    partitionExecutor = PartitionExecutor(console, '/backend-test/simrun/partitionWorkerMock')
    partitionExecutor.init()
    partitionWorkerMockReceiver = PartitionWorkerMockReceiver()
    return partitionWorkerMockReceiver.startServer()
  }

  const stopExecutorAndReceiver = () => Promise.all([
    partitionExecutor && partitionExecutor.shutdown(),
    partitionExecutor && partitionWorkerMockReceiver.stopServer()
  ])

  describe('one executioner for all tests', () => {
    before(() => {
      return startExecutorAndReceiver()
        .then(() => partitionExecutor.configureWorkers(executorConfig, traderConfigs))
    })

    after(stopExecutorAndReceiver)

    it('createTraders should initialise workers with config indices', () => {
      const createdTradersCalled = partitionWorkerMockReceiver.getCreatedTradersCalled()
      createdTradersCalled.should.have.length(executorConfig.partitionWorkerCount)
      createdTradersCalled.forEach(call => {
        const actualConfigs = JSON.stringify(call.traderConfigs)
        expectedTraderConfigs.findIndex(expectedConfigs =>
          actualConfigs === JSON.stringify(expectedConfigs.traderConfigs)
        ).should.not.equal(-1, 'unexpected createTraders call: ' + actualConfigs)
      })
    })

    it('should forward slices to traders', () => {
      const slice = { unixNow: 100, transactions: [{ a: 2 }, { a: 3 }, { a: 4 }] }

      return partitionExecutor.drainTransactions(slice)
        .then(() => {
          const drainTransactionsCalled = partitionWorkerMockReceiver.getDrainTransactionsCalled()
          drainTransactionsCalled.should.have.length(executorConfig.partitionWorkerCount)
          drainTransactionsCalled
            .forEach(drainCalled => drainCalled.should.deep.equal(slice))
        })
    })

    it('should get all accounts (unsorted)', () => {
      return partitionExecutor.getAllAccounts()
        .then(results => {
          results.should.have.length(executorConfig.partitionWorkerCount * 2)
        })
    })

    it('should get all accounts sorted by fullVolume', () => {
      return partitionExecutor.getAllAccountsSorted()
        .then(results => {
          results.should.have.length(executorConfig.partitionWorkerCount * 2)
          results.reduce((previousVolume, current) => {
            previousVolume.should.be.above(current.fullVolume)
            return current.fullVolume
          }, Number.MAX_SAFE_INTEGER)
        })
    })
  })

  describe('one executioner per test', () => {
    beforeEach(startExecutorAndReceiver)
    afterEach(stopExecutorAndReceiver)

    it('re-configuration of workers + traders', () => {
      const createdTradersCount = () => partitionWorkerMockReceiver.getCreatedTradersCalled().length

      return partitionExecutor.configureWorkers(executorConfig, traderConfigs)
        .then(() => {
          createdTradersCount().should.equal(5)
          const partitionWorkerCount = 3
          const newExecutorConfig = Object.assign({}, executorConfig, { partitionWorkerCount })
          return partitionExecutor.configureWorkers(newExecutorConfig, traderConfigs)
        })
        .then(() => {
          createdTradersCount().should.equal(8)
        })
    })
  })
})
