const SimRunner = require('../../backend/simrun/simRunner')

describe('Sim Runner', () => {
  const testSimConfig = {
    transactionsUpdateSeconds: 100,
    rankingLimit: 10
  }

  const testTraderConfigs = [{ a: 1 }, { b: 2 }, { c: 3 }]

  const firstBatch = [{ tid: 1001, date: 100 }, { tid: 2004, date: 200 }, { tid: 2495, date: 249 }]
  const secondBatch = [{ tid: 2992, date: 299 }, { tid: 5008, date: 500 }]

  const TransactionSourceMock = () => {
    let batchIx = 0
    let batches = [
      { batchNum: 1, from: 100, to: 249, transactions: firstBatch },
      { batchNum: 2, from: 250, to: 599, transactions: secondBatch }
    ]

    const hasNext = () => batchIx < batches.length
    const next = () => Promise.resolve(batches[batchIx++])
    const transactionCount = () => firstBatch.length + secondBatch.length
    const batchCount = () => batches.length
    return { next, hasNext, transactionCount, batchCount }
  }

  const PartitionExecutorMock = () => {
    const data = {
      receivedSlices: [],
      configureWorkersCalled: false,
      getAllAccountsSortedCalled: false
    }

    const configureWorkers = (receivedExecConfig, receivedTraderConfigs) => {
      receivedExecConfig.should.deep.equal(testSimConfig)
      receivedTraderConfigs.should.deep.equal(testTraderConfigs)
      data.configureWorkersCalled = true
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

    const unexpectedCall = () => { throw Error(`unexpected function call to [${this.name}]`) }

    return {
      init: unexpectedCall,
      shutdown: unexpectedCall,

      configureWorkers,
      drainTransactions,
      getAllAccountsSorted,

      getReceivedTransactions: () => data.receivedSlices,
      configureWorkersCalled: () => data.configureWorkersCalled,
      getAllAccountsSortedCalled: () => data.getAllAccountsSortedCalled
    }
  }

  let simRunner, partitionExecutorMock

  beforeEach(() => {
    partitionExecutorMock = PartitionExecutorMock()
    simRunner = SimRunner(console, TransactionSourceMock(), partitionExecutorMock)
  })

  it('runs batches of transactions against traders and sorts transactions latest -> earliest', () => {
    return simRunner.run(testSimConfig, testTraderConfigs)
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

  it('calls getAllAccounts when done', () => {
    return simRunner.run(testSimConfig, testTraderConfigs)
      .then(() => partitionExecutorMock.getAllAccountsSortedCalled().should.equal(true))
  })

  it('should call configureWorkers with config object', () => {
    partitionExecutorMock.configureWorkersCalled().should.equal(false)
    return simRunner.run(testSimConfig, testTraderConfigs)
      .then(() => partitionExecutorMock.configureWorkersCalled().should.equal(true))
  })
})
