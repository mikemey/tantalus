const SimRunner = require('../../backend/simrun/simRunner')

describe('Sim Runner', () => {
  const config = {
    transactionsUpdateSeconds: 100,
    rankingLimit: 10
  }

  const firstBatch = [{ tid: 1001, date: 100 }, { tid: 2004, date: 200 }, { tid: 2495, date: 249 }]
  const secondBatch = [{ tid: 2992, date: 299 }, { tid: 5008, date: 500 }]

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
    simRunner = SimRunner(console, config, TransactionSourceMock(), partitionExecutorMock)
  })

  it('runs batches of transactions against traders and sorts transactions latest -> earliest', () => {
    return simRunner.run()
      .then(() => {
        partitionExecutorMock.getReceivedTransactions().should.deep.equal([
          { unixNow: 199, transactions: [firstBatch[0]] },
          { unixNow: 299, transactions: [secondBatch[0], firstBatch[2], firstBatch[1]] },
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
