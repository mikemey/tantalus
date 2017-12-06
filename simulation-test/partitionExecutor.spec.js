const express = require('express')
const bodyParser = require('body-parser')

const PartitionExecutor = require('../simulation/partitionExecutor')

const PartitionWorkerMockReceiver = () => {
  const data = {
    server: null,
    createdTradersCalled: [],
    runIterationCalled: []
  }

  const createTradersCalled = (req, res) => {
    data.createdTradersCalled.push(req.body)
    return res.status(200).send()
  }

  const runIterationCalled = (req, res) => {
    data.runIterationCalled.push(req.body)
    return res.status(200).send()
  }

  const startServer = () => new Promise((resolve, reject) => {
    const app = express()
    app.use(bodyParser.json())
    app.post('/createTradersCalled', createTradersCalled)
    app.post('/runIterationCalled', runIterationCalled)
    data.server = app.listen(12345, resolve)
  })

  const stopServer = () => data.server
    ? new Promise((resolve, reject) => data.server.close(resolve))
    : Promise.resolve()

  return {
    startServer,
    stopServer,
    getCreatedTradersCalled: () => data.createdTradersCalled,
    getRunIterationCalled: () => data.runIterationCalled
  }
}

describe('Partition executor', function () {
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
    partitionExecutor = PartitionExecutor(console, '/simulation-test/partitionWorkerMock')
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
        call.executorConfig.should.deep.equal(executorConfig)
        const actualConfigs = JSON.stringify(call.traderConfigs)
        expectedTraderConfigs.findIndex(expectedConfigs =>
          actualConfigs === JSON.stringify(expectedConfigs.traderConfigs)
        ).should.not.equal(-1, 'unexpected createTraders call: ' + actualConfigs)
      })
    })

    it('should forward slices to traders', () => {
      const iterationProgress = { bla: 'balbalbal' }

      return partitionExecutor.runIteration(iterationProgress)
        .then(() => {
          const drainTransactionsCalled = partitionWorkerMockReceiver.getRunIterationCalled()
          drainTransactionsCalled.should.have.length(executorConfig.partitionWorkerCount)
          drainTransactionsCalled
            .forEach(drainCalled => drainCalled.should.deep.equal(iterationProgress))
        })
    })

    it('should get all accounts (unsorted)', () => {
      return partitionExecutor.getAllAccounts()
        .then(results => {
          results.should.have.length(executorConfig.partitionWorkerCount * 2)
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
