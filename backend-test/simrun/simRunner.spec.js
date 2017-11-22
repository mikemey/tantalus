const SimRunner = require('../../backend/simrun/simRunner')

describe('Sim Runner', () => {
  const txsUpdateSeconds = 100
  const firstBatch = [{ date: 100, a: 2 }, { date: 200, a: 3 }, { date: 249, a: 4 }]
  const secondBatch = [{ date: 299, a: 5 }, { date: 500, a: 6 }]

  const TransactionSourceMock = () => {
    let batchIx = 0
    let batches = [
      { from: 100, to: 249, transactions: firstBatch },
      { from: 250, to: 599, transactions: secondBatch }
    ]

    const hasNext = () => batchIx < batches.length
    const next = () => Promise.resolve(batches[batchIx++])
    return { next, hasNext }
  }

  const PartitionExecutorMock = () => {
    const data = {
      receivedSlices: [],
      startWorkersCalled: false,
      stopWorkersCalled: false,
      getAllAccountsSortedCalled: false
    }

    const startWorkers = () => {
      data.startWorkersCalled = true
      return Promise.resolve()
    }

    const drainTransactions = transactionSlice => {
      data.receivedSlices.push(transactionSlice)
      return Promise.resolve()
    }

    const getAllAccountsSorted = () => {
      data.getAllAccountsSortedCalled = true
      return Promise.resolve([
        { clientId: 'trader1', amount: 'Ƀ 0.1230', price: '£/Ƀ 5854', volume: '£ 2321.21', fullVolume: '£ 2902.23' },
        { clientId: 'trader2', amount: 'abcd', price: 'efgh', volume: 'ijkl', fullVolume: 'mnop' }
      ])
    }

    const stopWorkers = () => {
      data.stopWorkersCalled = true
      return Promise.resolve()
    }

    return {
      startWorkers,
      stopWorkers,
      drainTransactions,
      getAllAccountsSorted,

      getReceivedTransactions: () => data.receivedSlices,
      startWorkersCalled: () => data.startWorkersCalled,
      stopWorkersCalled: () => data.stopWorkersCalled,
      getAllAccountsSortedCalled: () => data.getAllAccountsSortedCalled
    }
  }

  let simRunner, partitionExecutorMock

  beforeEach(() => {
    partitionExecutorMock = PartitionExecutorMock()
    simRunner = SimRunner(console, TransactionSourceMock(), partitionExecutorMock, txsUpdateSeconds)
  })

  it('runs batches of transactions against traders', () => {
    return simRunner.run()
      .then(() => {
        partitionExecutorMock.getReceivedTransactions().should.deep.equal([
          { unixNow: 199, transactions: [firstBatch[0]] },
          { unixNow: 299, transactions: [firstBatch[1], firstBatch[2], secondBatch[0]] },
          { unixNow: 399, transactions: [] },
          { unixNow: 499, transactions: [] },
          { unixNow: 599, transactions: [secondBatch[1]] }
        ])
      })
  })

  it('calls getAllAccounts when done, but NOT start/stop workers', () => {
    return simRunner.run()
      .then(() => {
        partitionExecutorMock.startWorkersCalled().should.equal(false)
        partitionExecutorMock.stopWorkersCalled().should.equal(false)
        partitionExecutorMock.getAllAccountsSortedCalled().should.equal(true)
      })
  })
})
