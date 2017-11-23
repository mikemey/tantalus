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

describe('Partition executor', function () {
  this.timeout(5000)

  const generatorConfig = {
    timeslotSeconds: { start: 100, end: 100, step: 50 },
    buying: {
      ratio: { start: 0, end: 3, step: 1 },
      useTimeslots: { start: 0, end: 2, step: 1 }
    },
    selling: {
      ratio: { start: 0, end: 0, step: 0.5 },
      useTimeslots: { start: 5, end: 5, step: 1 }
    },
    commonTraderConfig: { common: 'trader config' }
  }

  const executorConfig = {
    partitionWorkerCount: 5,
    generatorConfig
  }

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
        .then(() => partitionExecutor.configureWorkers(executorConfig))
    })

    after(stopExecutorAndReceiver)

    it('createTraders should initialise workers with config indices', () => {
      const createdTradersCalled = partitionWorkerMockReceiver.getCreatedTradersCalled()
      createdTradersCalled.should.have.length(executorConfig.partitionWorkerCount)
      createdTradersCalled.forEach(createdCall => {
        createdCall.generatorConfig.should.deep.equal(generatorConfig)

        const startIx = createdCall.configsStartIx
        const endIx = createdCall.configsEndIx
        switch (startIx) {
          case 0:
          case 5:
          case 10:
            endIx.should.equal(startIx + 1)
            break
          case 2:
          case 7:
            endIx.should.equal(startIx + 2)
            break
          default: throw Error('unexpected configStartIx: ' + startIx)
        }
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

    it('should forward result request', () => {
      return partitionExecutor.getAllAccountsSorted()
        .then(results => {
          results.should.have.length(executorConfig.partitionWorkerCount * 2)
          results.reduce((previousVolume, current) => {
            previousVolume.should.be.above(current.fullValue)
            return current.fullValue
          }, Number.MAX_SAFE_INTEGER)
        })
    })
  })

  describe('one executioner per test', () => {
    beforeEach(startExecutorAndReceiver)
    afterEach(stopExecutorAndReceiver)

    it('re-configuration of workers + traders', () => {
      const createdTradersCount = () => partitionWorkerMockReceiver.getCreatedTradersCalled().length

      return partitionExecutor.configureWorkers(executorConfig)
        .then(() => {
          createdTradersCount().should.equal(5)
          const partitionWorkerCount = 3
          const newExecutorConfig = Object.assign({}, executorConfig, { partitionWorkerCount })
          return partitionExecutor.configureWorkers(newExecutorConfig)
        })
        .then(() => {
          createdTradersCount().should.equal(8)
        })
    })
  })
})
